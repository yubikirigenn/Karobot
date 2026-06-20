'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [stats, setStats] = useState({ activeCount: 0, totalCount: 0 });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});

    // モーダルの表示判定
    const hideModal = localStorage.getItem('hide-migration-modal');
    if (hideModal !== 'true') {
      setShowModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleDoNotShowAgain = () => {
    localStorage.setItem('hide-migration-modal', 'true');
    setShowModal(false);
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="navbar-brand">
            🤖 <span>KaroBot</span>
          </Link>
          <div className="navbar-nav">
            <Link href="/auth/login" className="btn btn-ghost">ログイン</Link>
            <Link href="/auth/register" className="btn btn-primary">無料で始める</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          <span className="gradient-text">Karotter Bot</span>を<br />
          誰でも簡単に作成
        </h1>
        <p className="hero-description">
          AIがタイムラインの空気を読んで自動投稿。いいね、リプライ、リカロートも全自動。
          あなただけのBotをノーコードで作成・管理できます。
        </p>
        <div className="hero-actions">
          <Link href="/auth/register" className="btn btn-primary btn-lg">
            ✨ 無料で始める
          </Link>
          <Link href="/auth/login" className="btn btn-secondary btn-lg">
            ログイン
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '48px' }}>
          <div className="glass-card stat-card" style={{ minWidth: '140px' }}>
            <div className="stat-value">{stats.activeCount}</div>
            <div className="stat-label">稼働中のBot</div>
          </div>
          <div className="glass-card stat-card" style={{ minWidth: '140px' }}>
            <div className="stat-value">{stats.totalCount}</div>
            <div className="stat-label">登録Bot総数</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '0 16px 64px' }}>
        <div className="feature-grid">
          <div className="glass-card feature-item">
            <div className="feature-icon">🧠</div>
            <h3 className="feature-title">AI自動投稿</h3>
            <p className="feature-desc">Gemini、Qwen、DeepSeek、GPTから選択。タイムラインの空気を読んで自然な投稿を自動生成。</p>
          </div>
          <div className="glass-card feature-item">
            <div className="feature-icon">💬</div>
            <h3 className="feature-title">自動リプライ</h3>
            <p className="feature-desc">メンションや返信を検知して、AIまたはテンプレートで自動応答。会話の流れも記憶します。</p>
          </div>
          <div className="glass-card feature-item">
            <div className="feature-icon">❤️</div>
            <h3 className="feature-title">いいね・リアクション</h3>
            <p className="feature-desc">AIが興味のある投稿を選別していいね。適切な絵文字リアクションも自動で。</p>
          </div>
          <div className="glass-card feature-item">
            <div className="feature-icon">🔄</div>
            <h3 className="feature-title">リカロート・引用</h3>
            <p className="feature-desc">気になる投稿をリカロート。引用リカロートにはAIコメントを自動付与。</p>
          </div>
          <div className="glass-card feature-item">
            <div className="feature-icon">📝</div>
            <h3 className="feature-title">テンプレートモード</h3>
            <p className="feature-desc">AIを使わず、設定したテンプレートから投稿。固定ローテーションまたはランダムから選択。</p>
          </div>
          <div className="glass-card feature-item">
            <div className="feature-icon">⚙️</div>
            <h3 className="feature-title">細かな設定</h3>
            <p className="feature-desc">確率コントロール、投稿間隔、ブロックリスト、機能ON/OFFなど詳細な調整が可能。</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
        <p className="text-sm text-muted">© 2026 KaroBot Manager — Karotter Bot管理サービス</p>
      </footer>

      {/* Migration Alert Modal */}
      {showModal && (
        <div className="migration-modal-overlay">
          <div className="migration-modal">
            <h2 className="migration-modal-header">
              ⚠️ データベース移行に伴うアカウント再開のお願い
            </h2>
            <div className="migration-modal-body">
              <p>いつも KaroBot をご利用いただきありがとうございます。</p>
              <p>この度、サービスのデータベース移行を行いました。以前からご利用のお客様は、以下の簡単な手順でこれまでの設定をそのまま引き継ぐことができます。</p>
              <ul>
                <li><strong>手順1:</strong> 以前と<strong>同じメールアドレス</strong>で再度「無料で始める（新規登録）」を行ってください。</li>
                <li><strong>手順2:</strong> 登録が完了すると、過去の Bot 設定が自動的にアカウントに結びつき、これまで通りご利用いただけます。</li>
              </ul>
              <p>※セキュリティ上、以前のパスワードは引き継がれません。任意の新しいパスワードを設定してご登録ください。</p>
            </div>
            <div className="migration-modal-actions">
              <button className="btn btn-secondary" onClick={handleDoNotShowAgain}>
                二度と表示しない
              </button>
              <button className="btn btn-primary" onClick={handleCloseModal}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
