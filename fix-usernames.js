const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bots = await prisma.bot.findMany();
  let updatedCount = 0;
  for (const bot of bots) {
    if (bot.karotterUsername.startsWith('@')) {
      const newUsername = bot.karotterUsername.replace(/^@/, '');
      await prisma.bot.update({
        where: { id: bot.id },
        data: { karotterUsername: newUsername }
      });
      console.log(`Updated bot ${bot.name}: ${bot.karotterUsername} -> ${newUsername}`);
      updatedCount++;
    }
  }
  console.log(`Finished updating ${updatedCount} bots.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
