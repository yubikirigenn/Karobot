const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bots = await prisma.bot.findMany();
  if (bots.length === 0) {
    console.log('No bots found');
    return;
  }
  const botId = bots[0].id;
  
  try {
    const res = await prisma.bot.update({
      where: { id: botId },
      data: {
        autoPostMode: 'SPECIFIC_TIMES',
        specificTimes: ['08:00', '19:00'],
        fixedIntervalMinutes: 120
      }
    });
    console.log('Update success:', res.autoPostMode, res.specificTimes, res.fixedIntervalMinutes);
  } catch (err) {
    console.error('Update failed:', err);
  }
}

main().finally(() => prisma.$disconnect());
