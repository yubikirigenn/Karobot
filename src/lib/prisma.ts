// ==========================================
// Prisma クライアント (Prisma 7 + pg adapter)
// ==========================================
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || 'postgres://dummy:dummy@localhost:5432/dummy';
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is not set. Using dummy connection string for build time.');
  }

  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
