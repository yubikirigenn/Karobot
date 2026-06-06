import { executeBotCycle } from '@/lib/karotter/executor';
import { prisma } from '@/lib/prisma';

let isRunning = false;
let cronTimer: NodeJS.Timeout | null = null;

export function startCron() {
  if (cronTimer) return;
  console.log('[Internal Cron] Starting 1-minute background loop...');
  cronTimer = setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const activeBots = await prisma.bot.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true }
      });
      for (const bot of activeBots) {
        try {
          await executeBotCycle(bot.id);
        } catch (e) {
          console.error(`[Internal Cron] Error for bot ${bot.name}:`, e);
        }
      }
    } catch (e) {
      console.error('[Internal Cron] Global Error:', e);
    } finally {
      isRunning = false;
    }
  }, 60 * 1000); // 1分おきに実行
}
