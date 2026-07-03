// ==========================================
// API: Bot稼働状態切り替え
// POST /api/bots/[id]/toggle
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/botStateStore';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const bot = await prisma.bot.findUnique({ where: { id } });
    if (!bot || bot.userId !== user.id) {
      return NextResponse.json({ error: 'Botが見つかりません' }, { status: 404 });
    }

    const newStatus = bot.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    const updated = await prisma.bot.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, status: true },
    });

    // メモリ上のストアにも即時反映
    store.updateBotFields(id, { status: newStatus }, false);

    return NextResponse.json({ bot: updated });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    return NextResponse.json({ error: '切り替えに失敗しました' }, { status: 500 });
  }
}
