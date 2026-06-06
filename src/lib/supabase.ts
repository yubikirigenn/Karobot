// ==========================================
// Supabase クライアント設定
// ==========================================
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// --- ブラウザ用クライアント ---
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// --- サーバーサイド用クライアント (Service Role Key) ---
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
