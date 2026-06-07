import 'dotenv/config';
import { prisma } from './src/lib/prisma.ts';

async function main() {
  const bot = await prisma.bot.findUnique({
    where: { id: 'cmq2ieii600142adz4y5j5swj' }
  });
  console.log('Bot details:', bot ? { id: bot.id, name: bot.name, username: bot.karotterUsername } : 'Not found');
  
  const bot2 = await prisma.bot.findFirst({
    where: { karotterUsername: 'yudetamagobot' }
  });
  console.log('Yudetamagobot details:', bot2 ? { id: bot2.id, name: bot2.name, username: bot2.karotterUsername } : 'Not found');
}

main().catch(console.error).finally(() => prisma.$disconnect());
