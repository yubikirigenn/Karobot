// ==========================================
// API: Bot手動実行
// POST /api/bots/[id]/execute
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeBotCycle } from '@/lib/karotter/executor';

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

    const result = await executeBotCycle(id, true);

    return NextResponse.json({
      success: result.errors.length === 0,
      actions: result.actions,
      errors: result.errors,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    return NextResponse.json({ error: `実行エラー: ${e}` }, { status: 500 });
  }
}
