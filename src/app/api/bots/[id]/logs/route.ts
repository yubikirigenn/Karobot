// ==========================================
// API: Bot実行ログ取得
// GET /api/bots/[id]/logs
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { store } from '@/lib/botStateStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const bot = await prisma.bot.findUnique({ where: { id }, select: { userId: true } });
    if (!bot || bot.userId !== user.id) {
      return NextResponse.json({ error: 'Botが見つかりません' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // まだDBに同期されていないメモリ上の最新ログを取得
    const pendingLogs = store.getRecentLogs(id);
    const formattedPending = pendingLogs.map((pl, idx) => ({
      id: `pending-${idx}-${pl.createdAt.getTime()}`,
      action: pl.action,
      detail: pl.detail,
      targetPostId: pl.targetPostId,
      resultPostId: pl.resultPostId,
      success: pl.success,
      createdAt: pl.createdAt,
    }));

    // DB からログを取得
    const dbLogs = await prisma.botLog.findMany({
      where: { botId: id },
      orderBy: { createdAt: 'desc' },
      take: limit + offset, // 結合後にオフセットとリミットでスライスするため十分な量を取得
      select: {
        id: true,
        action: true,
        detail: true,
        targetPostId: true,
        resultPostId: true,
        success: true,
        createdAt: true,
      },
    });

    const mergedLogs = [...formattedPending, ...dbLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paginatedLogs = mergedLogs.slice(offset, offset + limit);
    const dbTotal = await prisma.botLog.count({ where: { botId: id } });
    const total = dbTotal + formattedPending.length;

    return NextResponse.json({ logs: paginatedLogs, total });
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
}
