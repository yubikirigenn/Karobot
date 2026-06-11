'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { BotSummary } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBots(); }, [fetchBots]);

  const handleLogout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleToggle = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/bots/${id}/toggle`, { method: 'POST' });
      if (res.ok) await fetchBots();
    } catch { /* ignore */ }
    setActionLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleExecute = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [`exec-${id}`]: true }));
    try {
      await fetch(`/api/bots/${id}/execute`, { method: 'POST' });
      await fetchBots();
    } catch { /* ignore */ }
    setActionLoading(prev => ({ ...prev, [`exec-${id}`]: false }));
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      const res = await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchBots();
    } catch { /* ignore */ }
  };

  const modeLabel = (mode: string) => {
    switch (mode) {
      case 'AI': return '🧠 AI';
      case 'FIXED_TEMPLATE': return '📋 固定';
      case 'RANDOM_TEMPLATE': return '🎲 ランダム';
      default: return mode;
    }
  };

  const providerLabel = (provider: string) => {
    switch (provider) {
      case 'GEMINI': return 'Gemini';
      case 'GROQ_QWEN': return 'Qwen(Groq)';
      case 'DEEPSEEK': return 'DeepSeek';
      case 'OPENAI_GPT': return 'GPT';
      case 'OPENROUTER': return 'OpenRouter';
      default: return '';
    }
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/dashboard" className="navbar-brand">
            🤖 <span>KaroBot</span>
          </Link>
          <div className="navbar-nav">
            <button onClick={handleLogout} className="btn btn-ghost">ログアウト</button>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">ダッシュボード</h1>
            <p className="page-subtitle">あなたのBotを管理</p>
          </div>
          <Link href="/bots/new" className="btn btn-primary">
            ＋ 新しいBotを作成
          </Link>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: '64px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
          </div>
        ) : bots.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">🤖</div>
            <h2 className="empty-state-title">まだBotがありません</h2>
            <p className="empty-state-text">最初のBotを作成して、Karotterでの自動運用を始めましょう。</p>
            <Link href="/bots/new" className="btn btn-primary">
              ✨ Botを作成する
            </Link>
          </div>
        ) : (
          <div className="grid grid-2">
            {bots.map(bot => (
              <div key={bot.id} className="glass-card bot-card">
                <div className="bot-card-header">
                  <div>
                    <div className="bot-card-name">{bot.name}</div>
                    <div className="bot-card-username">@{bot.karotterUsername}</div>
                  </div>
                  <span className={`badge ${bot.status === 'ACTIVE' ? 'badge-active' : 'badge-paused'}`}>
                    {bot.status === 'ACTIVE' ? '● 稼働中' : '⏸ 停止中'}
                  </span>
                </div>

                <div className="bot-card-meta">
                  <span className="bot-card-meta-item">
                    {modeLabel(bot.postMode)}
                  </span>
                  {bot.aiProvider !== 'NONE' && (
                    <span className="bot-card-meta-item">
                      {providerLabel(bot.aiProvider)}
                    </span>
                  )}
                  {bot.lastExecutedAt && (
                    <span className="bot-card-meta-item">
                      🕐 {new Date(bot.lastExecutedAt).toLocaleString('ja-JP')}
                    </span>
                  )}
                </div>

                <div className="bot-card-actions">
                  <button
                    onClick={() => handleToggle(bot.id)}
                    className={`btn btn-sm ${bot.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                    disabled={!!actionLoading[bot.id]}
                  >
                    {actionLoading[bot.id]
                      ? <span className="spinner" />
                      : bot.status === 'ACTIVE' ? '⏸ 停止' : '▶ 開始'}
                  </button>
                  <button
                    onClick={() => handleExecute(bot.id)}
                    className="btn btn-sm btn-secondary"
                    disabled={!!actionLoading[`exec-${bot.id}`]}
                  >
                    {actionLoading[`exec-${bot.id}`]
                      ? <span className="spinner" />
                      : '⚡ 手動実行'}
                  </button>
                  <Link href={`/bots/${bot.id}`} className="btn btn-sm btn-ghost">
                    ✏️ 編集
                  </Link>
                  <Link href={`/bots/${bot.id}/logs`} className="btn btn-sm btn-ghost">
                    📋 ログ
                  </Link>
                  <button
                    onClick={() => handleDelete(bot.id, bot.name)}
                    className="btn btn-sm btn-ghost"
                    style={{ color: 'var(--color-error)' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
