// ==========================================
// SyncManager — Supabase DB との定期同期
// 5分ごとにインメモリのログやseenPostsをバッチ書き込みし、
// Web UI側で行われたBot設定の変更をプルしてメモリに同期する。
// ==========================================

import { store } from './botStateStore';

let isSyncing = false;
let syncTimer: NodeJS.Timeout | null = null;
let lastSyncTime = new Date();

export function startSync() {
  if (syncTimer) return;
  console.log('[SyncManager] Starting 5-minute database sync loop...');
  syncTimer = setInterval(async () => {
    await syncWithDb();
  }, 5 * 60 * 1000); // 5分おきに同期
}

export async function syncWithDb() {
  if (isSyncing) return;
  isSyncing = true;
  console.log('[SyncManager] Syncing local data with Supabase...');
  try {
    const { prisma } = await import('./prisma');
    const now = new Date();

    // 1. メモリ上の保留データを取得してクリア
    const { logs, seenPosts, botUpdates } = store.flushPendingData();

    // 2. ログのバッチ保存 (createMany)
    if (logs.length > 0) {
      try {
        await prisma.botLog.createMany({
          data: logs.map(l => ({
            botId: l.botId,
            action: l.action,
            detail: l.detail,
            success: l.success,
            targetPostId: l.targetPostId,
            resultPostId: l.resultPostId,
            createdAt: l.createdAt,
          })),
        });
        console.log(`[SyncManager] Synced ${logs.length} logs to DB`);
      } catch (err) {
        console.error('[SyncManager] Error syncing logs:', err);
      }
    }

    // 3. seenPosts のバッチ保存
    if (seenPosts.length > 0) {
      try {
        // createMany は PostgreSQL で重複エラー(P2002)が発生する可能性があるため、
        // 重複をフィルタリングしたうえで createMany を呼ぶか、もしくはそのまま実行
        // seenPosts は unique 制約 [botId, postId] を持つため、安全のために分割/除外
        // 基本的にメモリ上で一度しか発生しないはずだが、重複チェック
        const uniqueSeenPosts = [];
        const seenKeys = new Set();
        for (const sp of seenPosts) {
          const key = `${sp.botId}_${sp.postId}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueSeenPosts.push(sp);
          }
        }

        await prisma.seenPost.createMany({
          data: uniqueSeenPosts.map(sp => ({
            botId: sp.botId,
            postId: sp.postId,
            type: sp.type as any,
            createdAt: sp.createdAt,
          })),
          skipDuplicates: true, // Prisma 7 + Postgres では対応
        });
        console.log(`[SyncManager] Synced ${uniqueSeenPosts.length} seenPosts to DB`);
      } catch (err) {
        console.error('[SyncManager] Error syncing seenPosts:', err);
      }
    }

    // 4. Bot状態の同期（Render実行中に蓄積した runtime state）
    if (botUpdates.size > 0) {
      for (const [botId, updateData] of botUpdates.entries()) {
        try {
          // threadMemory, botKnowledge などの JSON フィールドや status の更新
          await prisma.bot.update({
            where: { id: botId },
            data: updateData,
          });
        } catch (err) {
          console.error(`[SyncManager] Error updating bot ${botId}:`, err);
        }
      }
      console.log(`[SyncManager] Synced runtime state for ${botUpdates.size} bots to DB`);
    }

    // 5. DB から Web UI 側での変更をプルしてメモリに反映
    // 前回同期時刻以降に更新されたBot設定を取得
    const remoteUpdates = await prisma.bot.findMany({
      where: {
        updatedAt: { gte: lastSyncTime },
      },
    });

    if (remoteUpdates.length > 0) {
      for (const remoteBot of remoteUpdates) {
        const localBot = store.getBotData(remoteBot.id);
        if (localBot) {
          // Webで更新された設定をメモリに反映（メモリ側の未同期の runtime state があれば、上書きしないようにする）
          // Webで編集されるのは基本的に基本設定やprobabilities、featuresなど
          // runtime state(threadMemory, recentPosts 等)はメモリ側が最新なのでそれ以外を同期
          const runtimeKeys = ['threadMemory', 'botKnowledge', 'recentPosts', 'lastExecutedAt', 'lastAutoPostAt', 'accessToken', 'tokenExpiresAt', 'actionStates'];
          const updateObj: Record<string, any> = {};
          
          for (const key of Object.keys(remoteBot)) {
            if (!runtimeKeys.includes(key)) {
              updateObj[key] = (remoteBot as any)[key];
            }
          }
          store.updateBotFields(remoteBot.id, updateObj, false);
        } else {
          // 新しく作成されたBotの場合
          store.addBotToStore(remoteBot);
        }
      }
      console.log(`[SyncManager] Pulled ${remoteUpdates.length} bot updates from DB`);
    }

    // 6. DBから削除されたボットの同期
    const allDbBots = await prisma.bot.findMany({ select: { id: true } });
    const dbBotIds = new Set(allDbBots.map(b => b.id));
    const localBotIds = store.getAllBotIds();
    for (const localId of localBotIds) {
      if (!dbBotIds.has(localId)) {
        store.removeBotFromStore(localId);
        console.log(`[SyncManager] Removed deleted bot from store: ${localId}`);
      }
    }
    
    lastSyncTime = now;
  } catch (e) {
    console.error('[SyncManager] Sync failed:', e);
  } finally {
    isSyncing = false;
  }
}

/** graceful shutdown 用の緊急同期 */
export async function flushSyncBeforeShutdown() {
  console.log('[SyncManager] Flushing pending changes before shutdown...');
  await syncWithDb();
}
