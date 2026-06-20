// ==========================================
// 認証ヘルパー — Supabase Auth
// ==========================================
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from './prisma';
import { NextRequest, NextResponse } from 'next/server';

// --- サーバーコンポーネント / API Route用 Supabase クライアント ---
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component では set できないが問題なし
          }
        },
      },
    }
  );
}

// --- 現在のセッションユーザーを取得 ---
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. まず現在の authId でユーザーを探す
  let dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
  });

  // 2. 見つからなかった場合、メールアドレスで既存ユーザーを検索
  if (!dbUser && user.email) {
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existingUserByEmail) {
      // 既存のユーザーが見つかった場合、新しい authId (UUID) に更新して紐付ける
      dbUser = await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: { authId: user.id },
      });
      console.log(`[AUTH] Automatically linked existing user: ${user.email} with new authId ${user.id}`);
    }
  }

  // 3. それでも見つからない（本当の新規ユーザー）場合のみ、作成する
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        authId: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
      },
    });
  }

  return dbUser;
}

// --- API Route 用の認証チェック ---
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// --- Middleware用 Supabase クライアント ---
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 未認証ユーザーを保護されたルートからリダイレクト
  const protectedPaths = ['/dashboard', '/bots'];
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーをauth画面からリダイレクト
  const authPaths = ['/auth/login', '/auth/register'];
  const isAuthPage = authPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
