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
    
    // 安全に文字列の構造を解析（パスワード漏洩を防ぎつつ、パース失敗原因を特定）
    try {
      const isQuoted = connectionString.startsWith('"') || connectionString.startsWith("'") || connectionString.endsWith('"') || connectionString.endsWith("'");
      const hasSpace = connectionString.includes(' ') || connectionString.includes('\r') || connectionString.includes('\n');
      const length = connectionString.length;
      const prefix = connectionString.slice(0, 25);
      const suffix = connectionString.slice(-25);
      const atCount = (connectionString.match(/@/g) || []).length;
      const colonCount = (connectionString.match(/:/g) || []).length;
      const percentCount = (connectionString.match(/%/g) || []).length;
      console.log(`[PrismaInitDebug] Length: ${length}, Quoted: ${isQuoted}, HasSpace: ${hasSpace}`);
      console.log(`[PrismaInitDebug] Starts: ${prefix}, Ends: ${suffix}`);
      console.log(`[PrismaInitDebug] Counts - @: ${atCount}, :: ${colonCount}, %: ${percentCount}`);
    } catch (debugErr) {
      console.error('[PrismaInitDebug] Failed to analyze string:', debugErr);
    }
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
