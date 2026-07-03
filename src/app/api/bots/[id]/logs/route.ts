// ==========================================
// API: Bot実行ログ取得
// GET /api/bots/[id]/logs
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const logs = await prisma.botLog.findMany({
      where: { botId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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

    const total = await prisma.botLog.count({ where: { botId: id } });

    return NextResponse.json({ logs, total });
  } catch {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
}
