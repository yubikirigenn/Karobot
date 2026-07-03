// ==========================================
// API: Bot一覧取得 / 新規作成
// GET /api/bots — ログインユーザーのBot一覧
// POST /api/bots — 新規Bot作成
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { KarotterClient } from '@/lib/karotter/client';
import { store } from '@/lib/botStateStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();

    // メモリ上のストアから取得 (DBアクセス排除)
    const bots = store.getBotsForUser(user.id);

    return NextResponse.json({ bots }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch (e: any) {
    console.error("GET error:", e);
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // バリデーション
    if (!body.name || !body.karotterUsername || !body.karotterPassword) {
      return NextResponse.json({ error: 'Bot名、Karotterユーザー名、パスワードは必須です' }, { status: 400 });
    }

    // AIモード時のAPIキー必須化バリデーション
    if (body.postMode === 'AI' && body.aiProvider !== 'NONE' && !body.aiApiKey) {
      return NextResponse.json({ error: 'AIモードを使用する場合、APIキーは必須です' }, { status: 400 });
    }

    // パスワードとAPIキーを暗号化
    const karotterPasswordEnc = encrypt(body.karotterPassword);
    const aiApiKeyEnc = body.aiApiKey ? encrypt(body.aiApiKey) : null;

    // ログインテスト
    const client = new KarotterClient({ username: body.karotterUsername.trim().replace(/^@/, ''), password: body.karotterPassword });
    try {
      await client.login();
    } catch (e) {
      return NextResponse.json({ error: 'Karotterのログインに失敗しました。ユーザーIDとパスワードを確認してください。' }, { status: 400 });
    }

    const bot = await prisma.bot.create({
      data: {
        userId: user.id,
        name: body.name,
        karotterUsername: body.karotterUsername.trim().replace(/^@/, ''),
        karotterPasswordEnc,
        postMode: body.postMode || 'AI',
        aiProvider: body.aiProvider || 'NONE',
        aiApiKeyEnc,
        aiModel: body.aiModel || 'gemini-3.1-flash-lite',
        cloneTargetUsername: body.cloneTargetUsername || null,
        systemInstruction: body.systemInstruction || '',
        postTemplates: body.postTemplates || [],
        replyTemplates: body.replyTemplates || [],
        mentionSystemInstruction: body.mentionSystemInstruction || '',
        mentionReplyTemplates: body.mentionReplyTemplates || [],
        dmSystemInstruction: body.dmSystemInstruction || '',
        dmReplyTemplates: body.dmReplyTemplates || [],
        probabilities: body.probabilities || { like: 0.02, rekarot: 0, quote: 0.025, reply: 0.03, react: 0.03 },
        features: body.features || {
          autoPost: true, like: true, rekarot: false, quoteRekarot: true,
          reply: true, reaction: true, followBack: true, notificationReply: true, mentionReaction: true, selfLearning: true, nightMode: true, dmReply: true,
        },
        blockedUsers: body.blockedUsers || [],
        autoPostMinInterval: body.autoPostMinInterval || 30,
        autoPostPaceMultiplier: body.autoPostPaceMultiplier || 4.7,
        autoPostMaxInterval: body.autoPostMaxInterval || 3600,
        autoPostMode: body.autoPostMode || 'DYNAMIC_PACE',
        fixedIntervalMinutes: body.fixedIntervalMinutes || 60,
        specificTimes: body.specificTimes || [],
      },
      select: {
        id: true,
        name: true,
        karotterUsername: true,
        postMode: true,
        aiProvider: true,
        status: true,
        createdAt: true,
      },
    });

    // 最新状態をDBから取得してメモリに追加
    const fullBot = await prisma.bot.findUnique({ where: { id: bot.id } });
    if (fullBot) {
      store.addBotToStore(fullBot);
    }

    return NextResponse.json({ bot }, { status: 201 });
  } catch (e) {
    console.error('Bot作成エラー:', e);
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Bot作成に失敗しました: ${errorMessage}` }, { status: 500 });
  }
}
