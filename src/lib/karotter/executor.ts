// ==========================================
// Bot実行エンジン — 1サイクル分の処理
// 3フェーズに分離:
//   Phase 1: 自発カロート
//   Phase 2: 通知処理（メンション反応含む）
//   Phase 3: ランダムアクション
// ==========================================
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { KarotterClient } from './client';
import { postKaroto, likePost, rekarotPost, reactPost, followUser } from './actions';
import { getGlobalPosts, getPostDetail, getRootId, resolveQuoteChain, buildTlContext, calculateTlPace, getActivityMultiplier } from './timeline';
import { getNotifications, classifyNotification } from './notifications';
import { createProvider } from '@/lib/ai/provider';
import type { AiProvider } from '@/lib/ai/provider';
import {
  buildAutoPostPrompt, buildReplyPrompt, buildLikeSelectionPrompt,
  buildActionSelectionPrompt, buildEmojiSelectionPrompt,
  getTimeContext, extractKnowledgeAndClean
} from '@/lib/ai/prompts';
import type { BotFeatures, Probabilities } from '@/types';

// --- 共通コンテキスト（フェーズ間で共有） ---
interface BotContext {
  bot: Awaited<ReturnType<typeof prisma.bot.findUnique>> & Record<string, unknown>;
  client: KarotterClient;
  provider: AiProvider;
  features: BotFeatures;
  probabilities: Probabilities;
  blockedUsers: string[];
  seenIds: Set<string>;
  aiPostedIds: Set<string>;
  systemInst: string;
  mentionSystemInst: string;
  actions: string[];
  errors: string[];
}

/**
 * 指定されたBotの1サイクル分の処理を実行
 */
export async function executeBotCycle(botId: string, forceAutoPost: boolean = false): Promise<{ actions: string[]; errors: string[] }> {
  const actions: string[] = [];
  const errors: string[] = [];

  // Bot設定を取得
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: { seenPosts: { select: { postId: true, type: true } } },
  });

  if (!bot) {
    errors.push('Botが見つかりません');
    return { actions, errors };
  }

  if (bot.status !== 'ACTIVE') {
    return { actions: ['Bot is paused'], errors };
  }

  const features = bot.features as unknown as BotFeatures;
  const probabilities = bot.probabilities as unknown as Probabilities;
  const blockedUsers = (bot.blockedUsers as unknown as string[]) || [];

  // Karotterクライアントを初期化
  const password = decrypt(bot.karotterPasswordEnc);
  const client = new KarotterClient({
    username: bot.karotterUsername,
    password,
    accessToken: bot.accessToken,
  });

  // トークンがなければログイン
  if (!bot.accessToken) {
    try {
      const token = await client.login();
      await prisma.bot.update({
        where: { id: botId },
        data: { accessToken: token, tokenExpiresAt: new Date(Date.now() + 300000) },
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      errors.push(`Karotterログインに失敗しました: ${errorMsg}`);
      await logAction(botId, 'ERROR', `ログイン失敗: ${errorMsg}`, false);
      return { actions, errors };
    }
  }

  // AIプロバイダーを初期化
  let aiApiKey = '';
  if (bot.aiProvider !== 'NONE' && bot.aiApiKeyEnc) {
    aiApiKey = decrypt(bot.aiApiKeyEnc);
  }

  const templateMode = bot.postMode === 'FIXED_TEMPLATE' ? 'fixed' : 'random';
  const provider = createProvider(
    bot.postMode === 'AI' ? bot.aiProvider : 'NONE',
    aiApiKey,
    bot.aiModel,
    {
      postTemplates: (bot.postTemplates as string[]) || [],
      replyTemplates: (bot.replyTemplates as string[]) || [],
      templateIndex: bot.templateIndex,
      mode: templateMode,
    }
  );

  // 既読IDセットを構築
  const seenIds = new Set(bot.seenPosts.filter(s => s.type === 'SEEN').map(s => s.postId));
  const aiPostedIds = new Set(bot.seenPosts.filter(s => s.type === 'AI_POSTED').map(s => s.postId));

  const systemInst = bot.systemInstruction || '';
  const mentionSystemInst = (bot as Record<string, unknown>).mentionSystemInstruction as string || '';

  // コンテキストを構築
  const ctx: BotContext = {
    bot: bot as BotContext['bot'],
    client, provider, features, probabilities, blockedUsers,
    seenIds, aiPostedIds, systemInst, mentionSystemInst,
    actions, errors,
  };

  // === Phase 1: 自発カロート ===
  let didAutoPost = false;
  if (features.autoPost) {
    didAutoPost = await executeAutoPost(ctx, forceAutoPost);
  }

  // === Phase 2: 通知処理（メンション反応含む） ===
  if (features.notificationReply) {
    await executeNotifications(ctx);
  }

  // === Phase 3: ランダムアクション ===
  // 定期投稿モード（FIXED_INTERVAL / SPECIFIC_TIMES）の場合、
  // 自発カロートが発生したサイクルでのみランダムアクションを実行
  const autoPostMode = bot.autoPostMode || 'DYNAMIC_PACE';
  const isScheduledMode = autoPostMode === 'FIXED_INTERVAL' || autoPostMode === 'SPECIFIC_TIMES';
  const shouldRunRandomActions = isScheduledMode ? didAutoPost : true;

  if (shouldRunRandomActions) {
    await executeRandomActions(ctx);
  }

  // トークンをキャッシュ更新
  await prisma.bot.update({
    where: { id: botId },
    data: {
      accessToken: client.getAccessToken(),
      lastExecutedAt: new Date(),
    },
  });

  return { actions, errors };
}

// ==========================================
// Phase 1: 自発カロート
// ==========================================
async function executeAutoPost(ctx: BotContext, forceAutoPost: boolean): Promise<boolean> {
  const { bot, client, provider, blockedUsers, systemInst, actions, errors } = ctx;
  const botId = bot.id;

  let shouldAutoPost = false;
  const now = new Date();
  const lastPostTime = bot.lastAutoPostAt ? new Date(bot.lastAutoPostAt).getTime() : 0;
  const diffSec = (now.getTime() - lastPostTime) / 1000;

  const mode = bot.autoPostMode || 'DYNAMIC_PACE';

  if (mode === 'FIXED_INTERVAL') {
    const intervalSec = (bot.fixedIntervalMinutes || 60) * 60;
    shouldAutoPost = diffSec > intervalSec;
  } else if (mode === 'SPECIFIC_TIMES') {
    // JST (UTC+9) の現在時刻を取得
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const targetTimes = (bot.specificTimes as string[]) || [];
    shouldAutoPost = targetTimes.some(time => {
      const [targetH, targetM] = time.split(':').map(Number);
      const targetMinutes = targetH * 60 + targetM;
      const currentMinutes = jstNow.getUTCHours() * 60 + jstNow.getUTCMinutes();
      const diffMinutes = currentMinutes - targetMinutes;
      return diffMinutes >= 0 && diffMinutes <= 5 && diffSec > 45 * 60;
    });
  } else {
    // DYNAMIC_PACE
    shouldAutoPost = !bot.lastAutoPostAt || diffSec > bot.autoPostMinInterval;
  }

  if (forceAutoPost) {
    shouldAutoPost = true;
  }

  if (!shouldAutoPost) return false;

  try {
    const timeline = await getGlobalPosts(client, 60);
    const tlContext = buildTlContext(timeline, bot.karotterUsername, blockedUsers);
    const recentPosts = (bot.recentPosts as string[]) || [];
    const timeContext = getTimeContext();

    let postText: string;
    if (bot.postMode === 'AI') {
      const prompt = buildAutoPostPrompt(tlContext, recentPosts, timeContext);
      const raw = await provider.generateText(prompt, systemInst, { temperature: 0.85 });
      const { cleanText, knowledge } = extractKnowledgeAndClean(raw);
      postText = cleanText;
      if (knowledge && ctx.features.selfLearning) {
        await updateKnowledge(botId, knowledge);
      }
    } else {
      postText = await provider.generateText('', '', {});
    }

    if (postText && postText !== 'SKIP') {
      const newId = await postKaroto(client, postText);
      if (newId) {
        actions.push(`自発カロート: ${postText.slice(0, 50)}`);
        await markSeen(botId, newId, 'AI_POSTED');
        await updateRecentPosts(botId, postText);
        await logAction(botId, 'POST', postText.slice(0, 200), true, undefined, newId);
      }
    }

    await prisma.bot.update({
      where: { id: botId },
      data: { lastAutoPostAt: new Date() },
    });

    return true;
  } catch (e) {
    errors.push(`自発カロートエラー: ${e}`);
    await logAction(botId, 'ERROR', `自発カロートエラー: ${e}`, false);
    return false;
  }
}

// ==========================================
// Phase 2: 通知処理（メンション反応含む）
// ==========================================
async function executeNotifications(ctx: BotContext): Promise<void> {
  const { bot, client, provider, features, blockedUsers, seenIds, aiPostedIds, systemInst, mentionSystemInst, actions, errors } = ctx;
  const botId = bot.id;
  const botFeatures = features as unknown as import('@/types').BotFeatures;
  const actMult = getActivityMultiplier(botFeatures?.nightMode !== false);

  // メンション反応用テンプレートを取得
  const mentionReplyTemplates = ((bot as Record<string, unknown>).mentionReplyTemplates as string[]) || [];

  try {
    const notifications = await getNotifications(client);
    for (const n of notifications) {
      if (typeof n !== 'object' || !n) continue;

      const classified = classifyNotification(n, bot.karotterUsername, aiPostedIds);

      if (classified.type === 'ignore') continue;
      if (seenIds.has(classified.postId)) continue;
      if (classified.authorUsername.toLowerCase() === bot.karotterUsername.toLowerCase()) continue;
      if (classified.authorUsername.toLowerCase().includes('bot')) continue;
      if (blockedUsers.map(u => u.toLowerCase()).includes(classified.authorUsername.toLowerCase())) continue;

      // フォローバック
      if (classified.type === 'follow' && features.followBack) {
        if (classified.authorId) {
          await followUser(client, classified.authorId);
          actions.push(`フォローバック: @${classified.authorUsername}`);
          await logAction(botId, 'FOLLOW', `@${classified.authorUsername}をフォローバック`, true);
        }
        await markSeen(botId, classified.postId, 'SEEN');
        continue;
      }

      // メンション・リプライ・引用への返信
      if (['mention', 'reply', 'quote'].includes(classified.type)) {
        // メンション反応がOFFの場合はスキップ
        if (features.mentionReaction === false) {
          await markSeen(botId, classified.postId, 'SEEN');
          continue;
        }

        if (Math.random() > actMult) {
          actions.push(`既読スルー: @${classified.authorUsername}`);
          await markSeen(botId, classified.postId, 'SEEN');
          continue;
        }

        let cleanContent = classified.content.replace(new RegExp(`^@${bot.karotterUsername}\\s*`, 'i'), '').trim();
        if (!cleanContent && !classified.mediaUrls.length) cleanContent = 'こんにちは';

        // メンション反応用のシステムプロンプトを決定
        // mentionSystemInstruction が設定されていればそちらを優先
        const effectiveSystemInst = mentionSystemInst || systemInst;

        if (bot.postMode === 'AI') {
          const postDetail = (n.post || {}) as import('@/types').KarotterPost;
          const quoteChain = await resolveQuoteChain(client, postDetail);
          const rootId = await getRootId(client, postDetail);

          // スレッドメモリから会話履歴を取得
          const threadMem = bot.threadMemory as Record<string, { conversations?: string[]; features?: string }> || {};
          const threadKey = `${classified.authorUsername}_${rootId}`;
          const history = threadMem[threadKey]?.conversations?.join('\n') || '';

          const prompt = buildReplyPrompt(cleanContent, getTimeContext(), history, quoteChain, classified.isQuote);
          const raw = await provider.generateWithImages(prompt, classified.mediaUrls, effectiveSystemInst, { temperature: 0.7 });
          const { cleanText, knowledge } = extractKnowledgeAndClean(raw);

          if (knowledge && features.selfLearning) {
            await updateKnowledge(botId, knowledge);
          }

          if (cleanText && cleanText !== 'SKIP') {
            let replyText = cleanText;
            let actionType: 'REPLY' | 'QUOTE' = 'REPLY';

            if (classified.isQuote && cleanText.startsWith('[QUOTE]')) {
              replyText = cleanText.replace('[QUOTE]', '').trim();
              actionType = 'QUOTE';
            } else if (cleanText.startsWith('[REPLY]')) {
              replyText = cleanText.replace('[REPLY]', '').trim();
            }

            const newId = actionType === 'QUOTE'
              ? await postKaroto(client, replyText, { quoteId: classified.postId })
              : await postKaroto(client, replyText, { parentId: classified.postId });

            if (newId) {
              actions.push(`${actionType}: @${classified.authorUsername} → ${replyText.slice(0, 50)}`);
              await markSeen(botId, newId, 'AI_POSTED');
              await logAction(botId, actionType, `@${classified.authorUsername}に返信: ${replyText.slice(0, 200)}`, true, classified.postId, newId);
            }
          }
        } else {
          // テンプレートモード
          // メンション専用テンプレートがあればそちらを使用
          let replyText: string;
          if (mentionReplyTemplates.length > 0) {
            const idx = Math.floor(Math.random() * mentionReplyTemplates.length);
            replyText = mentionReplyTemplates[idx];
          } else {
            replyText = await provider.generateWithImages('', [], '', {});
          }

          if (replyText && replyText !== 'SKIP') {
            const newId = await postKaroto(client, replyText, { parentId: classified.postId });
            if (newId) {
              actions.push(`REPLY(テンプレート): @${classified.authorUsername}`);
              await logAction(botId, 'REPLY', `テンプレート返信: ${replyText.slice(0, 200)}`, true, classified.postId, newId);
            }
          }
        }
        await markSeen(botId, classified.postId, 'SEEN');
      }
    }
  } catch (e) {
    errors.push(`通知処理エラー: ${e}`);
    await logAction(botId, 'ERROR', `通知処理エラー: ${e}`, false);
  }
}

// ==========================================
// Phase 3: ランダムアクション
// ==========================================
async function executeRandomActions(ctx: BotContext): Promise<void> {
  const { bot, client, provider, features, probabilities, blockedUsers, seenIds, aiPostedIds, systemInst, actions, errors } = ctx;
  const botId = bot.id;
  const actMult = getActivityMultiplier();

  try {
    const totalProb = (probabilities.like + probabilities.rekarot + probabilities.quote + probabilities.reply + probabilities.react) * actMult;
    const rand = Math.random();

    if (rand < totalProb) {
      let actionType: string;
      const r = rand / actMult;
      if (r < probabilities.like) actionType = 'LIKE';
      else if (r < probabilities.like + probabilities.rekarot) actionType = 'REKAROT';
      else if (r < probabilities.like + probabilities.rekarot + probabilities.quote) actionType = 'QUOTE';
      else if (r < probabilities.like + probabilities.rekarot + probabilities.quote + probabilities.react) actionType = 'REACT';
      else actionType = 'REPLY';

      // 対応する機能がOFFなら何もしない
      const featureMap: Record<string, boolean> = {
        LIKE: features.like, REKAROT: features.rekarot, QUOTE: features.quoteRekarot,
        REACT: features.reaction, REPLY: features.reply,
      };
      if (!featureMap[actionType]) {
        // スキップ
      } else {
        const globalPosts = await getGlobalPosts(client, 60);
        const candidates = globalPosts.filter(p => {
          const actual = p.post || p;
          const author = actual.author?.username || actual.user?.username || '';
          const pid = String(actual.id);
          if (author.toLowerCase() === bot.karotterUsername.toLowerCase()) return false;
          if (author.toLowerCase().includes('bot')) return false;
          if (blockedUsers.map(u => u.toLowerCase()).includes(author.toLowerCase())) return false;
          if (seenIds.has(pid) || aiPostedIds.has(pid)) return false;
          return true;
        }).slice(0, 10);

        if (candidates.length > 0) {
          if (actionType === 'LIKE' && bot.postMode === 'AI') {
            const candidateInfos = candidates.map(c => ({
              id: String(c.id), author: c.author?.username || 'unknown', content: String(c.content || '').slice(0, 100),
            }));
            const prompt = buildLikeSelectionPrompt(candidateInfos, 5);
            const result = await provider.generateText(prompt, '', { temperature: 0.7 });
            if (result !== 'SKIP') {
              const ids = result.match(/\d+/g) || [];
              for (const id of ids.slice(0, 5)) {
                await likePost(client, id);
                actions.push(`いいね: ID ${id}`);
                await logAction(botId, 'LIKE', `投稿 ${id} にいいね`, true, id);
                await markSeen(botId, id, 'SEEN');
              }
            }
          } else if (actionType === 'LIKE') {
            // テンプレートモード: ランダムにいいね
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            const tid = String(target.id);
            await likePost(client, tid);
            actions.push(`いいね(ランダム): ID ${tid}`);
            await logAction(botId, 'LIKE', `投稿 ${tid} にいいね`, true, tid);
            await markSeen(botId, tid, 'SEEN');
          } else if (actionType === 'REACT') {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            const tid = String(target.id);
            let emoji = '❤️';
            if (bot.postMode === 'AI') {
              const prompt = buildEmojiSelectionPrompt(target.content || '');
              const result = await provider.generateText(prompt, '', { temperature: 0.6 });
              const match = result.match(/最終決定:\s*(.)/);
              emoji = match ? match[1] : '❤️';
            } else {
              const emojis = ['❤️', '✨', '👀', '👍', '🤔', '🙌', '👏'];
              emoji = emojis[Math.floor(Math.random() * emojis.length)];
            }
            await reactPost(client, tid, emoji);
            actions.push(`リアクション: ${emoji} → ID ${tid}`);
            await logAction(botId, 'REACT', `${emoji} リアクション`, true, tid);
            await markSeen(botId, tid, 'SEEN');
          } else if (actionType === 'REKAROT') {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            const tid = String(target.id);
            await rekarotPost(client, tid);
            actions.push(`リカロート: ID ${tid}`);
            await logAction(botId, 'REKAROT', `投稿 ${tid} をリカロート`, true, tid);
            await markSeen(botId, tid, 'SEEN');
          } else if (actionType === 'QUOTE' || actionType === 'REPLY') {
            let selectedId: string | null = null;
            if (bot.postMode === 'AI') {
              const candidateInfos = candidates.map(c => ({
                id: String(c.id), author: c.author?.username || 'unknown', content: String(c.content || '').slice(0, 100),
              }));
              const prompt = buildActionSelectionPrompt(candidateInfos);
              const result = await provider.generateText(prompt, '', { temperature: 0.7 });
              const match = result.match(/\d+/);
              selectedId = match ? match[0] : null;
            } else {
              selectedId = String(candidates[Math.floor(Math.random() * candidates.length)].id);
            }

            if (selectedId) {
              const target = candidates.find(c => String(c.id) === selectedId);
              if (target) {
                const content = target.content || '';
                let replyText: string;
                if (bot.postMode === 'AI') {
                  const prompt = actionType === 'QUOTE'
                    ? `以下の投稿を引用リツイートします。フランクにコメントして:\n「${content}」`
                    : content;
                  const raw = await provider.generateText(
                    buildReplyPrompt(prompt, getTimeContext(), '', '', false),
                    systemInst, { temperature: 0.7 }
                  );
                  const { cleanText } = extractKnowledgeAndClean(raw);
                  replyText = cleanText;
                } else {
                  replyText = await provider.generateText('', '', {});
                }

                if (replyText && replyText !== 'SKIP') {
                  const newId = actionType === 'QUOTE'
                    ? await postKaroto(client, replyText, { quoteId: selectedId })
                    : await postKaroto(client, replyText, { parentId: selectedId });
                  if (newId) {
                    actions.push(`${actionType}: ${replyText.slice(0, 50)}`);
                    await logAction(botId, actionType, replyText.slice(0, 200), true, selectedId, newId);
                    await markSeen(botId, newId, 'AI_POSTED');
                  }
                }
                await markSeen(botId, selectedId, 'SEEN');
              }
            }
          }
        }
      }
    }
  } catch (e) {
    errors.push(`ランダムアクションエラー: ${e}`);
  }
}

// --- ヘルパー関数 ---
async function markSeen(botId: string, postId: string, type: 'SEEN' | 'AI_POSTED') {
  try {
    await prisma.seenPost.upsert({
      where: { botId_postId: { botId, postId } },
      update: { type },
      create: { botId, postId, type },
    });
  } catch { /* duplicate ok */ }
}

async function logAction(botId: string, action: string, detail: string, success: boolean, targetPostId?: string, resultPostId?: string) {
  try {
    await prisma.botLog.create({
      data: { botId, action, detail, success, targetPostId: targetPostId || null, resultPostId: resultPostId || null },
    });
  } catch (e) {
    console.error(`ログ記録エラー: ${e}`);
  }
}

async function updateRecentPosts(botId: string, text: string) {
  const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { recentPosts: true } });
  const posts = ((bot?.recentPosts as string[]) || []);
  posts.push(text.replace(/\n/g, ' '));
  const trimmed = posts.slice(-10);
  await prisma.bot.update({ where: { id: botId }, data: { recentPosts: trimmed } });
}

async function updateKnowledge(botId: string, knowledge: string) {
  const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { botKnowledge: true } });
  const list = ((bot?.botKnowledge as string[]) || []);
  list.push(knowledge);
  const trimmed = list.slice(-15);
  await prisma.bot.update({ where: { id: botId }, data: { botKnowledge: trimmed } });
  console.log(`💡 AIが新しい知識を学習: ${knowledge}`);
}
