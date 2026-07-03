// ==========================================
// Prisma クライアント (Prisma 7 + pg adapter)
// ==========================================
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[PrismaInit] DATABASE_URL is not set. Using dummy client for build.');
    return new PrismaClient();
  }

  // 安全にホスト名と接続情報をログに出力（パスワードは非表示）
  try {
    const parsed = new URL(connectionString);
    const maskedUser = parsed.username ? (parsed.username.length > 8 ? parsed.username.slice(0, 8) + '...' : parsed.username) : 'none';
    console.log(`[PrismaInit] DB Connection - Host: ${parsed.hostname}, Port: ${parsed.port || '5432'}, User: ${maskedUser}`);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error('[PrismaInit] Failed to parse DATABASE_URL as URL object:', errorMsg);
  }

  // pgのPoolを使用し、接続文字列のデコードとSSLオプションを明示的に渡す
  const pool = new Pool({
    connectionString: decodeURIComponent(connectionString),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
