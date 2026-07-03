import { executeBotCycle } from '@/lib/karotter/executor';
import { store } from '../botStateStore';
import { startSync } from '../syncManager';

let isRunning = false;
let cronTimer: NodeJS.Timeout | null = null;

export async function startCron() {
  if (cronTimer) return;

  // 1. 初回起動時に DB からメモリへロード
  console.log('[Internal Cron] Loading database into memory store...');
  try {
    await store.loadFromDb();
  } catch (e) {
    console.error('[Internal Cron] Failed to initialize memory store from DB:', e);
  }

  // 2. 同期ループ (SyncManager) を開始
  startSync();

  console.log('[Internal Cron] Starting 1-minute background loop...');
  cronTimer = setInterval(async () => {
    if (isRunning) return;
    if (!store.isLoaded) {
      console.warn('[Internal Cron] Store is not loaded yet. Skipping this cycle.');
      return;
    }
    isRunning = true;
    try {
      // メモリからACTIVEなBotを取得
      const activeBots = store.getAllActiveBots();
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
