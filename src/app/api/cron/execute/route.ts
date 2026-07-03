// ==========================================
// API: Cron実行エンドポイント
// POST /api/cron/execute
// cron-job.org から定期的に呼ばれる
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { executeBotCycle } from '@/lib/karotter/executor';
import { store } from '@/lib/botStateStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Cron Secretで認証 (Header または Query Param)
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 全てのACTIVEなBotを取得（メモリからロード）
    const activeBots = store.getAllActiveBots();

    const results = [];

    for (const bot of activeBots) {
      try {
        const result = await executeBotCycle(bot.id);
        results.push({
          botId: bot.id,
          botName: bot.name,
          actions: result.actions.length,
          errors: result.errors.length,
        });
      } catch (e) {
        results.push({
          botId: bot.id,
          botName: bot.name,
          actions: 0,
          errors: 1,
          error: String(e),
        });
      }
    }

    return NextResponse.json({
      success: true,
      botsProcessed: activeBots.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: `Cron実行エラー: ${e}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
