import 'dotenv/config';
import { prisma } from './src/lib/prisma.ts';

async function main() {
  const logs = await prisma.botLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] Bot ${log.botId} | Action: ${log.action} | Success: ${log.success} | Detail: ${log.detail}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
