'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'メールアドレスまたはパスワードが正しくありません'
          : authError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '36px' }}>🤖</div>
        <h1 className="auth-title">ログイン</h1>
        <p className="auth-subtitle">KaroBot Managerにログインしてください</p>

        {error && (
          <div style={{
            padding: '10px 16px', borderRadius: '8px', marginBottom: '20px',
            background: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="label" htmlFor="login-email">メールアドレス</label>
            <input
              id="login-email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="login-password">パスワード</label>
            <input
              id="login-password"
              type="password"
              className="input-field"
              placeholder="パスワードを入力"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? <><span className="spinner" /> ログイン中...</> : 'ログイン'}
          </button>
        </form>

        <div className="auth-footer">
          アカウントをお持ちでない方は <Link href="/auth/register">新規登録</Link>
        </div>
      </div>
    </div>
  );
}
