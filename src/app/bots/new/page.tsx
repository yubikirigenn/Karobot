'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AI_PROVIDERS } from '@/types';
import type { PostMode, AiProviderType, Probabilities, BotFeatures } from '@/types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '@/lib/ai/prompts';

const defaultProbs: Probabilities = { like: 0.02, rekarot: 0, quote: 0.025, reply: 0.03, react: 0.03 };
const defaultFeatures: BotFeatures = {
  autoPost: true, like: true, rekarot: false, quoteRekarot: true,
  reply: true, reaction: true, followBack: true, notificationReply: true, selfLearning: true,
};

export default function NewBotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 基本設定
  const [name, setName] = useState('');
  const [karotterUsername, setKarotterUsername] = useState('');
  const [karotterPassword, setKarotterPassword] = useState('');

  // 投稿モード
  const [postMode, setPostMode] = useState<PostMode>('AI');
  const [aiProvider, setAiProvider] = useState<AiProviderType>('GEMINI');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite');
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);

  // テンプレート
  const [postTemplates, setPostTemplates] = useState<string[]>(['']);
  const [replyTemplates, setReplyTemplates] = useState<string[]>(['']);

  // 確率
  const [probs, setProbs] = useState<Probabilities>(defaultProbs);

  // 機能フラグ
  const [features, setFeatures] = useState<BotFeatures>(defaultFeatures);

  // 間隔設定
  const [autoPostMode, setAutoPostMode] = useState<'DYNAMIC_PACE' | 'FIXED_INTERVAL' | 'SPECIFIC_TIMES'>('DYNAMIC_PACE');
  const [fixedIntervalMinutes, setFixedIntervalMinutes] = useState(60);
  const [specificTimes, setSpecificTimes] = useState<string[]>(['12:00']);
  const [minInterval, setMinInterval] = useState(30);
  const [paceMultiplier, setPaceMultiplier] = useState(4.7);
  const [maxInterval, setMaxInterval] = useState(3600);

  // ブロックリスト
  const [blockedUsersText, setBlockedUsersText] = useState('');

  const handleProviderChange = (provider: AiProviderType) => {
    setAiProvider(provider);
    const info = AI_PROVIDERS.find(p => p.id === provider);
    if (info) setAiModel(info.defaultModel);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const blockedUsers = blockedUsersText.split(',').map(s => s.trim()).filter(Boolean);

      const body = {
        name,
        karotterUsername,
        karotterPassword,
        postMode,
        aiProvider: postMode === 'AI' ? aiProvider : 'NONE',
        aiApiKey: postMode === 'AI' ? aiApiKey : undefined,
        aiModel: postMode === 'AI' ? aiModel : undefined,
        systemInstruction: postMode === 'AI' ? systemInstruction : '',
        postTemplates: postTemplates.filter(t => t.trim() !== ''),
        replyTemplates: replyTemplates.filter(t => t.trim() !== ''),
        probabilities: probs,
        features,
        blockedUsers,
        autoPostMinInterval: minInterval,
        autoPostPaceMultiplier: paceMultiplier,
        autoPostMaxInterval: maxInterval,
        autoPostMode,
        fixedIntervalMinutes,
        specificTimes,
      };

      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '作成に失敗しました');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const probSlider = (label: string, key: keyof Probabilities) => (
    <div className="slider-container" style={{ marginBottom: '12px' }}>
      <span className="text-sm" style={{ minWidth: '100px', color: 'var(--color-text-secondary)' }}>{label}</span>
      <input
        type="range" className="slider" min="0" max="0.2" step="0.005"
        value={probs[key]}
        onChange={e => setProbs(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
      />
      <span className="slider-value">{(probs[key] * 100).toFixed(1)}%</span>
    </div>
  );

  const featureToggle = (label: string, key: keyof BotFeatures) => (
    <label className="toggle" style={{ marginBottom: '10px', display: 'flex' }}>
      <input
        type="checkbox"
        checked={features[key]}
        onChange={e => setFeatures(prev => ({ ...prev, [key]: e.target.checked }))}
      />
      <span className="toggle-track" />
      <span className="toggle-label">{label}</span>
    </label>
  );

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/dashboard" className="navbar-brand">🤖 <span>KaroBot</span></Link>
          <div className="navbar-nav">
            <Link href="/dashboard" className="btn btn-ghost">← ダッシュボード</Link>
          </div>
        </div>
      </nav>

      <div className="page-container" style={{ maxWidth: '720px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">新しいBotを作成</h1>
            <p className="page-subtitle">Karotterで動作するBotの設定を行います</p>
          </div>
        </div>

        <div style={{
          padding: '16px 20px', borderRadius: '12px', marginBottom: '24px',
          background: 'rgba(255, 171, 0, 0.1)', border: '1px solid rgba(255, 171, 0, 0.3)',
          color: '#ffd06b'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> 登録前の確認事項
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
            Botを作成する前に、Karotterの公式サイトであらかじめ<strong>Bot用のアカウントを新規作成</strong>し、
            <strong>メール認証を完了</strong>させておく必要があります。まだの方はお済ませください。
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px', marginBottom: '24px',
            background: 'var(--color-error-bg)', color: 'var(--color-error)', fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 基本設定 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🤖</span> 基本設定</h2>
              <div className="form-group">
                <label className="label" htmlFor="bot-name">Bot名</label>
                <input id="bot-name" type="text" className="input-field" placeholder="例: ゆでたまごBot"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="karotter-username">KarotterユーザーID</label>
                <input id="karotter-username" type="text" className="input-field" placeholder="例: yudetamagobot"
                  value={karotterUsername} onChange={e => setKarotterUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="karotter-password">Karotterパスワード</label>
                <input id="karotter-password" type="password" className="input-field" placeholder="Karotterのログインパスワード"
                  value={karotterPassword} onChange={e => setKarotterPassword(e.target.value)} required />
                <p className="label-hint">🔒 AES-256-GCMで暗号化して安全に保存されます</p>
              </div>
            </div>
          </div>

          {/* 投稿モード */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🧠</span> 投稿モード</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {[
                  { value: 'AI' as PostMode, label: '🤖 AIモード', desc: 'AIがタイムラインの空気を読んで自動生成' },
                  { value: 'FIXED_TEMPLATE' as PostMode, label: '📋 固定テンプレート', desc: 'テンプレートを順番にローテーション' },
                  { value: 'RANDOM_TEMPLATE' as PostMode, label: '🎲 ランダムテンプレート', desc: 'テンプレートからランダム選択' },
                ].map(opt => (
                  <label key={opt.value} className="glass-card" style={{
                    padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    borderColor: postMode === opt.value ? 'var(--color-accent)' : undefined,
                    background: postMode === opt.value ? 'var(--color-bg-glass-hover)' : undefined,
                  }}>
                    <input type="radio" name="postMode" value={opt.value} checked={postMode === opt.value}
                      onChange={() => setPostMode(opt.value)} style={{ accentColor: 'var(--color-accent)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{opt.label}</div>
                      <div className="text-sm text-muted">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* AI設定 */}
              {postMode === 'AI' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label">AIプロバイダー</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {AI_PROVIDERS.map(p => (
                        <label key={p.id} className="glass-card" style={{
                          padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '8px',
                          borderColor: aiProvider === p.id ? 'var(--color-accent)' : undefined,
                          background: aiProvider === p.id ? 'var(--color-bg-glass-hover)' : undefined,
                        }}>
                          <input type="radio" name="aiProvider" value={p.id} checked={aiProvider === p.id}
                            onChange={() => handleProviderChange(p.id)} style={{ accentColor: 'var(--color-accent)', marginTop: '2px' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{p.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label" htmlFor="ai-api-key">APIキー</label>
                    <input id="ai-api-key" type="password" className="input-field"
                      placeholder={`${AI_PROVIDERS.find(p => p.id === aiProvider)?.name || ''} のAPIキー`}
                      value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} />
                    <p className="label-hint">🔒 暗号化して安全に保存されます</p>
                  </div>
                  <div className="form-group">
                    <label className="label" htmlFor="ai-model">モデル名</label>
                    <input id="ai-model" type="text" className="input-field"
                      value={aiModel} onChange={e => setAiModel(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label" htmlFor="system-instruction">キャラクター設定（System Instruction）</label>
                    <textarea id="system-instruction" className="input-field" rows={8}
                      value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)}
                      placeholder="Botの人格・話し方を定義するプロンプト" />
                  </div>
                </div>
              )}

              {/* テンプレート設定 */}
              {postMode !== 'AI' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label">投稿テンプレート</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {postTemplates.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <textarea className="input-field" rows={3} value={t} style={{ flex: 1 }}
                            placeholder="投稿内容を入力..."
                            onChange={e => {
                              const newTemplates = [...postTemplates];
                              newTemplates[i] = e.target.value;
                              setPostTemplates(newTemplates);
                            }} />
                          <button type="button" className="btn btn-ghost" style={{ padding: '8px', color: 'var(--color-error)' }}
                            onClick={() => setPostTemplates(postTemplates.filter((_, idx) => idx !== i))}>
                            ✖
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        onClick={() => setPostTemplates([...postTemplates, ''])}>
                        ＋ 投稿テンプレートを追加
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">リプライテンプレート</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {replyTemplates.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <textarea className="input-field" rows={2} value={t} style={{ flex: 1 }}
                            placeholder="リプライ内容を入力..."
                            onChange={e => {
                              const newTemplates = [...replyTemplates];
                              newTemplates[i] = e.target.value;
                              setReplyTemplates(newTemplates);
                            }} />
                          <button type="button" className="btn btn-ghost" style={{ padding: '8px', color: 'var(--color-error)' }}
                            onClick={() => setReplyTemplates(replyTemplates.filter((_, idx) => idx !== i))}>
                            ✖
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        onClick={() => setReplyTemplates([...replyTemplates, ''])}>
                        ＋ リプライテンプレートを追加
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 機能ON/OFF */}
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

          {/* 確率コントロール */}
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

          {/* 投稿間隔 */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>⏰</span> 投稿頻度</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {[
                  { value: 'DYNAMIC_PACE', label: '📊 ダイナミックペース', desc: 'タイムラインの流速に合わせて自動調整（推奨）' },
                  { value: 'FIXED_INTERVAL', label: '⏳ 固定間隔', desc: '指定した分数おきに定期的に投稿' },
                  { value: 'SPECIFIC_TIMES', label: '🕰 指定時刻', desc: '毎日決まった時間（日本時間）に投稿' },
                ].map(opt => (
                  <label key={opt.value} className="glass-card" style={{
                    padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    borderColor: autoPostMode === opt.value ? 'var(--color-accent)' : undefined,
                    background: autoPostMode === opt.value ? 'var(--color-bg-glass-hover)' : undefined,
                  }}>
                    <input type="radio" name="autoPostMode" value={opt.value} checked={autoPostMode === opt.value}
                      onChange={() => setAutoPostMode(opt.value as any)} style={{ accentColor: 'var(--color-accent)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{opt.label}</div>
                      <div className="text-sm text-muted">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {autoPostMode === 'DYNAMIC_PACE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label" htmlFor="min-interval">最小間隔（秒）</label>
                    <input id="min-interval" type="number" className="input-field"
                      value={minInterval} onChange={e => setMinInterval(parseInt(e.target.value) || 30)} min={10} />
                  </div>
                  <div className="form-group">
                    <label className="label" htmlFor="max-interval">最大間隔（秒）</label>
                    <input id="max-interval" type="number" className="input-field"
                      value={maxInterval} onChange={e => setMaxInterval(parseInt(e.target.value) || 3600)} min={60} />
                  </div>
                  <div className="form-group">
                    <label className="label" htmlFor="pace-mult">ペース倍率</label>
                    <input id="pace-mult" type="number" className="input-field" step="0.1"
                      value={paceMultiplier} onChange={e => setPaceMultiplier(parseFloat(e.target.value) || 4.7)} min={0.1} />
                  </div>
                </div>
              )}

              {autoPostMode === 'FIXED_INTERVAL' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label" htmlFor="fixed-interval">投稿間隔（分）</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input id="fixed-interval" type="number" className="input-field" style={{ maxWidth: '120px' }}
                        value={fixedIntervalMinutes} onChange={e => setFixedIntervalMinutes(parseInt(e.target.value) || 5)} min={5} />
                      <span className="text-muted">分ごとに投稿</span>
                    </div>
                    <p className="label-hint">※システムの仕様上、最短は「5分間隔」となります。</p>
                  </div>
                </div>
              )}

              {autoPostMode === 'SPECIFIC_TIMES' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label">投稿時刻（JST: 日本時間）</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {specificTimes.map((time, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                          <input type="time" className="input-field" style={{ maxWidth: '150px' }}
                            value={time} onChange={e => {
                              const newTimes = [...specificTimes];
                              newTimes[idx] = e.target.value;
                              setSpecificTimes(newTimes);
                            }} />
                          <button type="button" className="btn btn-secondary" onClick={() => {
                            setSpecificTimes(specificTimes.filter((_, i) => i !== idx));
                          }}>削除</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary" style={{ width: 'fit-content', marginTop: '8px' }}
                        onClick={() => setSpecificTimes([...specificTimes, '12:00'])}>
                        + 時刻を追加
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ブロックリスト */}
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <div className="section">
              <h2 className="section-title"><span>🚫</span> ブロックリスト</h2>
              <div className="form-group">
                <input type="text" className="input-field" placeholder="ユーザー名をカンマ区切りで（例: user1, user2）"
                  value={blockedUsersText} onChange={e => setBlockedUsersText(e.target.value)} />
                <p className="label-hint">@は不要です</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link href="/dashboard" className="btn btn-secondary">キャンセル</Link>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> 作成中...</> : '🤖 Botを作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
