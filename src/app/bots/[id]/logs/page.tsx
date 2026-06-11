'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import type { BotLogEntry } from '@/types';

const ACTION_ICONS: Record<string, string> = {
  POST: '✨', LIKE: '❤️', REPLY: '💬', REKAROT: '🔄', QUOTE: '📝',
  REACT: '😆', FOLLOW: '🤝', ERROR: '❌',
};

export default function BotLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [logs, setLogs] = useState<BotLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bots/${id}/logs?limit=${limit}&offset=${offset}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id, offset]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/dashboard" className="navbar-brand">🤖 <span>KaroBot</span></Link>
          <div className="navbar-nav">
            <Link href={`/bots/${id}`} className="btn btn-ghost">✏️ 設定</Link>
            <Link href="/dashboard" className="btn btn-ghost">← ダッシュボード</Link>
          </div>
        </div>
      </nav>

      <div className="page-container" style={{ maxWidth: '800px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">実行ログ</h1>
            <p className="page-subtitle">全{total}件のアクションログ</p>
          </div>
          <button onClick={() => fetchLogs()} className="btn btn-secondary" disabled={loading}>
            🔄 更新
          </button>
        </div>

        <div className="glass-card">
          {loading ? (
            <div className="text-center" style={{ padding: '48px' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h2 className="empty-state-title">ログがありません</h2>
              <p className="empty-state-text">Botを実行するとここにログが表示されます</p>
            </div>
          ) : (
            <>
              {logs.map(log => (
                <div key={log.id} className="log-entry">
                  <span className="log-time">
                    {new Date(log.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="log-action" style={{ color: log.success ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {ACTION_ICONS[log.action] || '📌'} {log.action}
                  </span>
                  <span className="log-detail">{log.detail}</span>
                </div>
              ))}

              {total > limit && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                  <button className="btn btn-sm btn-secondary" disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}>← 前へ</button>
                  <span className="text-sm text-muted" style={{ lineHeight: '32px' }}>
                    {offset + 1}〜{Math.min(offset + limit, total)} / {total}
                  </span>
                  <button className="btn btn-sm btn-secondary" disabled={offset + limit >= total}
                    onClick={() => setOffset(offset + limit)}>次へ →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
