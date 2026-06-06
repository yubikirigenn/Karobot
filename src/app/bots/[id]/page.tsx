'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AI_PROVIDERS } from '@/types';
import type { PostMode, AiProviderType, Probabilities, BotFeatures } from '@/types';

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [karotterUsername, setKarotterUsername] = useState('');
  const [karotterPassword, setKarotterPassword] = useState('');
  const [postMode, setPostMode] = useState<PostMode>('AI');
  const [aiProvider, setAiProvider] = useState<AiProviderType>('GEMINI');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [postTemplatesText, setPostTemplatesText] = useState('');
  const [replyTemplatesText, setReplyTemplatesText] = useState('');
  const [probs, setProbs] = useState<Probabilities>({ like: 0.02, rekarot: 0, quote: 0.025, reply: 0.03, react: 0.03 });
  const [features, setFeatures] = useState<BotFeatures>({
    autoPost: true, like: true, rekarot: false, quoteRekarot: true,
    reply: true, reaction: true, followBack: true, notificationReply: true, selfLearning: true,
  });
  const [minInterval, setMinInterval] = useState(30);
  const [paceMultiplier, setPaceMultiplier] = useState(4.7);
  const [maxInterval, setMaxInterval] = useState(3600);
  const [blockedUsersText, setBlockedUsersText] = useState('');

  const fetchBot = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${id}`);
      if (!res.ok) { router.push('/dashboard'); return; }
      const { bot } = await res.json();
      setName(bot.name);
      setKarotterUsername(bot.karotterUsername);
      setPostMode(bot.postMode);
      setAiProvider(bot.aiProvider);
      setAiModel(bot.aiModel);
      setSystemInstruction(bot.systemInstruction || '');
      setPostTemplatesText((bot.postTemplates || []).join('\n'));
      setReplyTemplatesText((bot.replyTemplates || []).join('\n'));
      setProbs(bot.probabilities || probs);
      setFeatures(bot.features || features);
      setMinInterval(bot.autoPostMinInterval || 30);
      setPaceMultiplier(bot.autoPostPaceMultiplier || 4.7);
      setMaxInterval(bot.autoPostMaxInterval || 3600);
      setBlockedUsersText((bot.blockedUsers || []).join(', '));
    } catch { router.push('/dashboard'); }
    setLoading(false);
  }, [id, router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBot(); }, [fetchBot]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name, karotterUsername, postMode,
        aiProvider: postMode === 'AI' ? aiProvider : 'NONE',
        aiModel, systemInstruction,
        postTemplates: postTemplatesText.split('\n').filter(Boolean),
        replyTemplates: replyTemplatesText.split('\n').filter(Boolean),
        probabilities: probs, features,
        blockedUsers: blockedUsersText.split(',').map(s => s.trim()).filter(Boolean),
        autoPostMinInterval: minInterval, autoPostPaceMultiplier: paceMultiplier, autoPostMaxInterval: maxInterval,
      };
      if (karotterPassword) body.karotterPassword = karotterPassword;
      if (aiApiKey) body.aiApiKey = aiApiKey;

      const res = await fetch(`/api/bots/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) { setError('保存に失敗しました'); return; }
      setSuccess('設定を保存しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('保存に失敗しました'); }
    setSaving(false);
  };

  const handleProviderChange = (provider: AiProviderType) => {
    setAiProvider(provider);
    const info = AI_PROVIDERS.find(p => p.id === provider);
    if (info) setAiModel(info.defaultModel);
  };

  const probSlider = (label: string, key: keyof Probabilities) => (
    <div className="slider-container" style={{ marginBottom: '12px' }}>
      <span className="text-sm" style={{ minWidth: '100px', color: 'var(--color-text-secondary)' }}>{label}</span>
      <input type="range" className="slider" min="0" max="0.2" step="0.005"
        value={probs[key]} onChange={e => setProbs(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))} />
      <span className="slider-value">{(probs[key] * 100).toFixed(1)}%</span>
    </div>
  );

  const featureToggle = (label: string, key: keyof BotFeatures) => (
    <label className="toggle" style={{ marginBottom: '10px', display: 'flex' }}>
      <input type="checkbox" checked={features[key]}
        onChange={e => setFeatures(prev => ({ ...prev, [key]: e.target.checked }))} />
      <span className="toggle-track" /><span className="toggle-label">{label}</span>
    </label>
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/dashboard" className="navbar-brand">🤖 <span>KaroBot</span></Link>
          <div className="navbar-nav">
            <Link href="/dashboard" className="btn btn-ghost">← ダッシュボード</Link>
            <Link href={`/bots/${id}/logs`} className="btn btn-ghost">📋 ログ</Link>
          </div>
        </div>
      </nav>

      <div className="page-container" style={{ maxWidth: '720px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Bot設定の編集</h1>
            <p className="page-subtitle">@{karotterUsername}</p>
          </div>
        </div>

        {error && <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: 'var(--color-success-bg)', color: 'var(--color-success)', fontSize: '13px' }}>{success}</div>}

        <form onSubmit={handleSave}>
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🤖</span> 基本設定</h2>
              <div className="form-group">
                <label className="label">Bot名</label>
                <input type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="label">KarotterユーザーID</label>
                <input type="text" className="input-field" value={karotterUsername} onChange={e => setKarotterUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="label">Karotterパスワード（変更する場合のみ）</label>
                <input type="password" className="input-field" placeholder="変更しない場合は空欄"
                  value={karotterPassword} onChange={e => setKarotterPassword(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🧠</span> 投稿モード</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {(['AI', 'FIXED_TEMPLATE', 'RANDOM_TEMPLATE'] as PostMode[]).map(mode => (
                  <label key={mode} className="glass-card" style={{
                    padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                    borderColor: postMode === mode ? 'var(--color-accent)' : undefined,
                  }}>
                    <input type="radio" name="postMode" checked={postMode === mode}
                      onChange={() => setPostMode(mode)} style={{ accentColor: 'var(--color-accent)' }} />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>
                      {mode === 'AI' ? '🤖 AIモード' : mode === 'FIXED_TEMPLATE' ? '📋 固定テンプレート' : '🎲 ランダム'}
                    </span>
                  </label>
                ))}
              </div>

              {postMode === 'AI' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label">AIプロバイダー</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {AI_PROVIDERS.map(p => (
                        <label key={p.id} className="glass-card" style={{
                          padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '8px',
                          borderColor: aiProvider === p.id ? 'var(--color-accent)' : undefined,
                        }}>
                          <input type="radio" name="aiProvider" checked={aiProvider === p.id}
                            onChange={() => handleProviderChange(p.id)} style={{ accentColor: 'var(--color-accent)', marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12px' }}>{p.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{p.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">APIキー（変更する場合のみ）</label>
                    <input type="password" className="input-field" placeholder="変更しない場合は空欄"
                      value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">モデル名</label>
                    <input type="text" className="input-field" value={aiModel} onChange={e => setAiModel(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">キャラクター設定</label>
                    <textarea className="input-field" rows={6} value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)} />
                  </div>
                </div>
              )}

              {postMode !== 'AI' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label">投稿テンプレート（1行に1つ）</label>
                    <textarea className="input-field" rows={5} value={postTemplatesText} onChange={e => setPostTemplatesText(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">リプライテンプレート（1行に1つ）</label>
                    <textarea className="input-field" rows={3} value={replyTemplatesText} onChange={e => setReplyTemplatesText(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>⚙️</span> 機能ON/OFF</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px' }}>
                {featureToggle('自発カロート', 'autoPost')}
                {featureToggle('いいね', 'like')}
                {featureToggle('リカロート', 'rekarot')}
                {featureToggle('引用リカロート', 'quoteRekarot')}
                {featureToggle('リプライ', 'reply')}
                {featureToggle('リアクション', 'reaction')}
                {featureToggle('フォローバック', 'followBack')}
                {featureToggle('通知自動返信', 'notificationReply')}
                {featureToggle('AI自己学習', 'selfLearning')}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🎲</span> 確率コントロール</h2>
              {probSlider('いいね', 'like')}
              {probSlider('リカロート', 'rekarot')}
              {probSlider('引用', 'quote')}
              {probSlider('リプライ', 'reply')}
              {probSlider('リアクション', 'react')}
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>⏰</span> 投稿間隔</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="label">最小（秒）</label>
                  <input type="number" className="input-field" value={minInterval} onChange={e => setMinInterval(parseInt(e.target.value) || 30)} />
                </div>
                <div className="form-group">
                  <label className="label">最大（秒）</label>
                  <input type="number" className="input-field" value={maxInterval} onChange={e => setMaxInterval(parseInt(e.target.value) || 3600)} />
                </div>
                <div className="form-group">
                  <label className="label">倍率</label>
                  <input type="number" className="input-field" step="0.1" value={paceMultiplier} onChange={e => setPaceMultiplier(parseFloat(e.target.value) || 4.7)} />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🚫</span> ブロックリスト</h2>
              <input type="text" className="input-field" placeholder="カンマ区切り" value={blockedUsersText} onChange={e => setBlockedUsersText(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link href="/dashboard" className="btn btn-secondary">キャンセル</Link>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? <><span className="spinner" /> 保存中...</> : '💾 設定を保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
