// ==========================================
// API: Bot詳細 / 更新 / 削除
// GET /api/bots/[id]
// PUT /api/bots/[id]
// DELETE /api/bots/[id]
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

async function getBotWithAuth(botId: string) {
  const user = await requireAuth();
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot || bot.userId !== user.id) return null;
  return bot;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bot = await getBotWithAuth(id);
    if (!bot) {
      return NextResponse.json({ error: 'Botが見つかりません' }, { status: 404 });
    }

    // パスワードとAPIキーを除外して返す
    const { karotterPasswordEnc, aiApiKeyEnc, accessToken, ...safeBot } = bot;
    return NextResponse.json({
      bot: {
        ...safeBot,
        hasAiApiKey: !!aiApiKeyEnc,
        hasKarotterPassword: !!karotterPasswordEnc,
      },
    });
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bot = await getBotWithAuth(id);
    if (!bot) {
      return NextResponse.json({ error: 'Botが見つかりません' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // 更新可能なフィールド
    const simpleFields = [
      'name', 'karotterUsername', 'postMode', 'aiProvider', 'aiModel',
      'systemInstruction', 'postTemplates', 'replyTemplates',
      'mentionSystemInstruction', 'mentionReplyTemplates',
      'probabilities', 'features', 'blockedUsers',
      'autoPostMinInterval', 'autoPostPaceMultiplier', 'autoPostMaxInterval',
      'autoPostMode', 'fixedIntervalMinutes', 'specificTimes',
    ];

    for (const field of simpleFields) {
      if (body[field] !== undefined) {
        if (field === 'karotterUsername' && typeof body[field] === 'string') {
          updateData[field] = body[field].trim().replace(/^@/, '');
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // パスワード更新（入力された場合のみ）
    if (body.karotterPassword) {
      updateData.karotterPasswordEnc = encrypt(body.karotterPassword);
      updateData.accessToken = null; // トークンキャッシュをリセット
    }

    // APIキー更新
    if (body.aiApiKey) {
      updateData.aiApiKeyEnc = encrypt(body.aiApiKey);
    }

    const updated = await prisma.bot.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, karotterUsername: true, postMode: true,
        aiProvider: true, status: true, updatedAt: true,
      },
    });

    return NextResponse.json({ bot: updated });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const errorMessage = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `更新に失敗しました: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bot = await getBotWithAuth(id);
    if (!bot) {
      return NextResponse.json({ error: 'Botが見つかりません' }, { status: 404 });
    }

    await prisma.bot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
