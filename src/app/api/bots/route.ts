// ==========================================
// API: Bot一覧取得 / 新規作成
// GET /api/bots — ログインユーザーのBot一覧
// POST /api/bots — 新規Bot作成
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();

    const bots = await prisma.bot.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        karotterUsername: true,
        postMode: true,
        aiProvider: true,
        status: true,
        lastExecutedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ bots });
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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

    // パスワードとAPIキーを暗号化
    const karotterPasswordEnc = encrypt(body.karotterPassword);
    const aiApiKeyEnc = body.aiApiKey ? encrypt(body.aiApiKey) : null;

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
        systemInstruction: body.systemInstruction || '',
        postTemplates: body.postTemplates || [],
        replyTemplates: body.replyTemplates || [],
        mentionSystemInstruction: body.mentionSystemInstruction || '',
        mentionReplyTemplates: body.mentionReplyTemplates || [],
        probabilities: body.probabilities || { like: 0.02, rekarot: 0, quote: 0.025, reply: 0.03, react: 0.03 },
        features: body.features || {
          autoPost: true, like: true, rekarot: false, quoteRekarot: true,
          reply: true, reaction: true, followBack: true, notificationReply: true, mentionReaction: true, selfLearning: true,
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
