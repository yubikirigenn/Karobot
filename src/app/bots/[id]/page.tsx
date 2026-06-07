'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AI_PROVIDERS } from '@/types';
import type { PostMode, AiProviderType, Probabilities, BotFeatures, TemplateObj } from '@/types';

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
  const [aiModel, setAiModel] = useState('gemini-3.1-flash-lite');
  const [cloneTargetUsername, setCloneTargetUsername] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [postTemplates, setPostTemplates] = useState<TemplateObj[]>([{ text: '', mediaUrls: [] }]);
  const [replyTemplates, setReplyTemplates] = useState<TemplateObj[]>([{ text: '', mediaUrls: [] }]);
  const [probs, setProbs] = useState<Probabilities>({ like: 0.02, rekarot: 0, quote: 0.025, reply: 0.03, react: 0.03 });
  const [features, setFeatures] = useState<BotFeatures>({
    autoPost: true, like: true, rekarot: false, quoteRekarot: true,
    reply: true, reaction: true, followBack: true, notificationReply: true, mentionReaction: true, selfLearning: true, nightMode: true,
  });
  const [autoPostMode, setAutoPostMode] = useState<'DYNAMIC_PACE' | 'FIXED_INTERVAL' | 'SPECIFIC_TIMES'>('DYNAMIC_PACE');
  const [fixedIntervalMinutes, setFixedIntervalMinutes] = useState<number | ''>(60);
  const [specificTimes, setSpecificTimes] = useState<string[]>(['12:00']);
  const [minInterval, setMinInterval] = useState<number | ''>(30);
  const [paceMultiplier, setPaceMultiplier] = useState<number | ''>(4.7);
  const [maxInterval, setMaxInterval] = useState<number | ''>(3600);
  const [blockedUsersText, setBlockedUsersText] = useState('');
  const [mentionSystemInstruction, setMentionSystemInstruction] = useState('');
  const [mentionReplyTemplates, setMentionReplyTemplates] = useState<TemplateObj[]>([{ text: '', mediaUrls: [] }]);

  const fetchBot = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text();
        setError(`Botの取得に失敗しました: ${res.status} ${text}`);
        setLoading(false);
        return;
      }
      const { bot } = await res.json();
      setName(bot.name);
      setKarotterUsername(bot.karotterUsername);
      setPostMode(bot.postMode);
      setAiProvider(bot.aiProvider);
      setAiModel(bot.aiModel);
      setCloneTargetUsername(bot.cloneTargetUsername || '');
      setSystemInstruction(bot.systemInstruction || '');

      const convertTemplates = (tmpls: any[]) => tmpls?.length > 0 
        ? tmpls.map((t: any) => typeof t === 'string' ? { text: t, mediaUrls: [] } : { text: t.text || '', mediaUrls: t.mediaUrls || [] })
        : [{ text: '', mediaUrls: [] }];

      setPostTemplates(convertTemplates(bot.postTemplates));
      setReplyTemplates(convertTemplates(bot.replyTemplates));
      setProbs(bot.probabilities || probs);
      setFeatures(bot.features || features);
      setAutoPostMode(bot.autoPostMode || 'DYNAMIC_PACE');
      setFixedIntervalMinutes(bot.fixedIntervalMinutes || 60);
      setSpecificTimes(bot.specificTimes || ['12:00']);
      setMinInterval(bot.autoPostMinInterval || 30);
      setPaceMultiplier(bot.autoPostPaceMultiplier || 4.7);
      setMaxInterval(bot.autoPostMaxInterval || 3600);
      setBlockedUsersText((bot.blockedUsers || []).join(', '));
      setMentionSystemInstruction(bot.mentionSystemInstruction || '');
      setMentionReplyTemplates(convertTemplates(bot.mentionReplyTemplates));
    } catch (e) {
      setError(`通信エラー: ${e}`);
      setLoading(false);
    }
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
        aiModel, 
        cloneTargetUsername: postMode === 'AI' && cloneTargetUsername.trim() !== '' ? cloneTargetUsername.trim() : null,
        systemInstruction,
        postTemplates: postTemplates.filter(t => t.text.trim() !== '' || (t.mediaUrls && t.mediaUrls.length > 0)),
        replyTemplates: replyTemplates.filter(t => t.text.trim() !== '' || (t.mediaUrls && t.mediaUrls.length > 0)),
        probabilities: probs, features,
        blockedUsers: blockedUsersText.split(',').map(s => s.trim()).filter(Boolean),
        mentionSystemInstruction,
        mentionReplyTemplates: mentionReplyTemplates.filter(t => t.text.trim() !== '' || (t.mediaUrls && t.mediaUrls.length > 0)),
        autoPostMinInterval: Number(minInterval) || 30, autoPostPaceMultiplier: Number(paceMultiplier) || 4.7, autoPostMaxInterval: Number(maxInterval) || 3600,
        autoPostMode, fixedIntervalMinutes: Math.max(5, Number(fixedIntervalMinutes) || 5), specificTimes,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number, type: 'post' | 'reply' | 'mention') => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        
        const updateState = (templates: TemplateObj[], setTemplates: any) => {
          const newTemplates = [...templates];
          if (!newTemplates[index].mediaUrls) newTemplates[index].mediaUrls = [];
          newTemplates[index].mediaUrls!.push(url);
          setTemplates(newTemplates);
        };

        if (type === 'post') updateState(postTemplates, setPostTemplates);
        else if (type === 'reply') updateState(replyTemplates, setReplyTemplates);
        else updateState(mentionReplyTemplates, setMentionReplyTemplates);
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  if (loading) {return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner spinner-lg" />
    </div>
  );
  }

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

        <div style={{
          padding: '16px 20px', borderRadius: '12px', marginBottom: '24px',
          background: 'rgba(255, 171, 0, 0.1)', border: '1px solid rgba(255, 171, 0, 0.3)',
          color: '#ffd06b'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> 確認事項
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
            Karotterの公式サイトであらかじめ<strong>Bot用のアカウントを作成</strong>し、
            <strong>メール認証を完了</strong>させておく必要があります。まだの方はお済ませください。
          </p>
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
                <p className="label-hint">※ @ は不要です（例: karobot_user）</p>
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
                    <label className="label">口調クローン対象（ユーザーID）</label>
                    <input type="text" className="input-field" placeholder="例: yudetamago"
                      value={cloneTargetUsername} onChange={e => setCloneTargetUsername(e.target.value)} />
                    <p className="label-hint">※指定したユーザーの直近の投稿から文の傾向や性格を読み取り反映します</p>
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
                    <label className="label">投稿テンプレート</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {postTemplates.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column', border: '1px solid var(--color-border)', padding: '8px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <textarea className="input-field" rows={3} value={t.text} style={{ flex: 1 }}
                              placeholder="投稿内容を入力..."
                              onChange={e => {
                                const newTemplates = [...postTemplates];
                                newTemplates[i].text = e.target.value;
                                setPostTemplates(newTemplates);
                              }} />
                            <button type="button" className="btn btn-ghost" style={{ padding: '8px', color: 'var(--color-error)' }}
                              onClick={() => setPostTemplates(postTemplates.filter((_, idx) => idx !== i))}>
                              ✖
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <label className="btn btn-secondary text-sm" style={{ cursor: 'pointer' }}>
                              📷 画像/動画を添付
                              <input type="file" style={{ display: 'none' }} accept="image/*,video/*" onChange={e => handleFileUpload(e, i, 'post')} />
                            </label>
                            {t.mediaUrls && t.mediaUrls.map((url, urlIdx) => (
                              <div key={urlIdx} style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-glass-hover)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                📎 添付済み
                                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-error)', marginLeft: '4px', cursor: 'pointer' }}
                                  onClick={() => {
                                    const newTemplates = [...postTemplates];
                                    newTemplates[i].mediaUrls = newTemplates[i].mediaUrls!.filter((_, idx) => idx !== urlIdx);
                                    setPostTemplates(newTemplates);
                                  }}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        onClick={() => setPostTemplates([...postTemplates, { text: '', mediaUrls: [] }])}>
                        ＋ 投稿テンプレートを追加
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">リプライテンプレート</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {replyTemplates.map((t, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column', border: '1px solid var(--color-border)', padding: '8px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <textarea className="input-field" rows={2} value={t.text} style={{ flex: 1 }}
                              placeholder="リプライ内容を入力..."
                              onChange={e => {
                                const newTemplates = [...replyTemplates];
                                newTemplates[i].text = e.target.value;
                                setReplyTemplates(newTemplates);
                              }} />
                            <button type="button" className="btn btn-ghost" style={{ padding: '8px', color: 'var(--color-error)' }}
                              onClick={() => setReplyTemplates(replyTemplates.filter((_, idx) => idx !== i))}>
                              ✖
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <label className="btn btn-secondary text-sm" style={{ cursor: 'pointer' }}>
                              📷 画像/動画を添付
                              <input type="file" style={{ display: 'none' }} accept="image/*,video/*" onChange={e => handleFileUpload(e, i, 'reply')} />
                            </label>
                            {t.mediaUrls && t.mediaUrls.map((url, urlIdx) => (
                              <div key={urlIdx} style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-glass-hover)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                📎 添付済み
                                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-error)', marginLeft: '4px', cursor: 'pointer' }}
                                  onClick={() => {
                                    const newTemplates = [...replyTemplates];
                                    newTemplates[i].mediaUrls = newTemplates[i].mediaUrls!.filter((_, idx) => idx !== urlIdx);
                                    setReplyTemplates(newTemplates);
                                  }}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        onClick={() => setReplyTemplates([...replyTemplates, { text: '', mediaUrls: [] }])}>
                        ＋ リプライテンプレートを追加
                      </button>
                    </div>
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
                {featureToggle('メンション反応', 'mentionReaction')}
                {featureToggle('AI自己学習', 'selfLearning')}
                {featureToggle('深夜おやすみモード', 'nightMode')}
              </div>

              {/* メンション反応の詳細設定 */}
              {features.mentionReaction && (
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📡</span> メンション反応設定
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '16px', lineHeight: 1.6 }}>
                    メンションやリプライを受け取った時の返信に使う設定です。空欄の場合はメインの設定を使用します。
                  </p>

                  {postMode === 'AI' && (
                    <div className="form-group">
                      <label className="label">メンション用キャラクター設定</label>
                      <textarea className="input-field" rows={5}
                        placeholder="空欄の場合はメインのキャラクター設定を使用"
                        value={mentionSystemInstruction}
                        onChange={e => setMentionSystemInstruction(e.target.value)} />
                    </div>
                  )}

                  {postMode !== 'AI' && (
                    <div className="form-group">
                      <label className="label">メンション用返信テンプレート</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {mentionReplyTemplates.map((t, i) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexDirection: 'column', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                              <textarea className="input-field" rows={2} value={t.text} style={{ flex: 1 }}
                                placeholder="空欄の場合はリプライテンプレートを使用"
                                onChange={e => {
                                  const newTemplates = [...mentionReplyTemplates];
                                  newTemplates[i].text = e.target.value;
                                  setMentionReplyTemplates(newTemplates);
                                }} />
                              <button type="button" className="btn btn-ghost" style={{ padding: '8px', color: 'var(--color-error)' }}
                                onClick={() => setMentionReplyTemplates(mentionReplyTemplates.filter((_, idx) => idx !== i))}>
                                ✖
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <label className="btn btn-secondary text-sm" style={{ cursor: 'pointer' }}>
                                📷 画像/動画を添付
                                <input type="file" style={{ display: 'none' }} accept="image/*,video/*" onChange={e => handleFileUpload(e, i, 'mention')} />
                              </label>
                              {t.mediaUrls && t.mediaUrls.map((url, urlIdx) => (
                                <div key={urlIdx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                  📎 添付済み
                                  <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-error)', marginLeft: '4px', cursor: 'pointer' }}
                                    onClick={() => {
                                      const newTemplates = [...mentionReplyTemplates];
                                      newTemplates[i].mediaUrls = newTemplates[i].mediaUrls!.filter((_, idx) => idx !== urlIdx);
                                      setMentionReplyTemplates(newTemplates);
                                    }}>✕</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                          onClick={() => setMentionReplyTemplates([...mentionReplyTemplates, { text: '', mediaUrls: [] }])}>
                          ＋ メンション用テンプレートを追加
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                    <label className="label">最小（秒）</label>
                    <input type="number" className="input-field" value={minInterval} onChange={e => setMinInterval(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="label">最大（秒）</label>
                    <input type="number" className="input-field" value={maxInterval} onChange={e => setMaxInterval(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="label">倍率</label>
                    <input type="number" className="input-field" step="0.1" value={paceMultiplier} onChange={e => setPaceMultiplier(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                </div>
              )}

              {autoPostMode === 'FIXED_INTERVAL' && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                  <div className="form-group">
                    <label className="label">投稿間隔（分）</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="number" className="input-field" style={{ maxWidth: '120px' }}
                        value={fixedIntervalMinutes} onChange={e => setFixedIntervalMinutes(e.target.value === '' ? '' : Number(e.target.value))} min={5} />
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
