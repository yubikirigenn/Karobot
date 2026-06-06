// ==========================================
// Next.js Middleware — ルート保護
// ==========================================
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // auth, dashboard, bots ルートにマッチ
    '/dashboard/:path*',
    '/bots/:path*',
    '/auth/:path*',
  ],
};
