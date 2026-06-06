'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '36px' }}>✨</div>
        <h1 className="auth-title">アカウント登録</h1>
        <p className="auth-subtitle">KaroBot Managerに無料で登録</p>

        {error && (
          <div style={{
            padding: '10px 16px', borderRadius: '8px', marginBottom: '20px',
            background: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="label" htmlFor="register-name">表示名</label>
            <input
              id="register-name"
              type="text"
              className="input-field"
              placeholder="あなたの名前"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="register-email">メールアドレス</label>
            <input
              id="register-email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="register-password">パスワード</label>
            <input
              id="register-password"
              type="password"
              className="input-field"
              placeholder="6文字以上"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="register-confirm">パスワード（確認）</label>
            <input
              id="register-confirm"
              type="password"
              className="input-field"
              placeholder="もう一度入力"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? <><span className="spinner" /> 登録中...</> : '無料で登録'}
          </button>
        </form>

        <div className="auth-footer">
          既にアカウントをお持ちの方は <Link href="/auth/login">ログイン</Link>
        </div>
      </div>
    </div>
  );
}
