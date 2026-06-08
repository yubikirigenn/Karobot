import React, { useState } from 'react';
import type { ActionIntervals, ReactionSettings, IntervalConfig, AutoPostMode } from '@/types';

interface Props {
  actionIntervals: ActionIntervals;
  setActionIntervals: React.Dispatch<React.SetStateAction<ActionIntervals>>;
  reactionSettings: ReactionSettings;
  setReactionSettings: React.Dispatch<React.SetStateAction<ReactionSettings>>;
}

export function ActionSettingsPanel({ actionIntervals, setActionIntervals, reactionSettings, setReactionSettings }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateInterval = (type: keyof ActionIntervals, field: keyof IntervalConfig, value: any) => {
    setActionIntervals(prev => {
      const current = prev[type] || { mode: 'DYNAMIC_PACE', fixedIntervalMinutes: 60, specificTimes: [], minInterval: 30, maxInterval: 3600 };
      return { ...prev, [type]: { ...current, [field]: value } };
    });
  };

  const clearInterval = (type: keyof ActionIntervals) => {
    setActionIntervals(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const renderActionSettings = (title: string, type: keyof ActionIntervals, icon: string) => {
    const isEnabled = !!actionIntervals[type];
    const config = actionIntervals[type] || { mode: 'DYNAMIC_PACE', fixedIntervalMinutes: 60, specificTimes: [], minInterval: 30, maxInterval: 3600 };
    const isExp = expanded[type];

    return (
      <div style={{ marginBottom: '16px', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div 
          onClick={() => toggleExpand(type)}
          style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{icon}</span>
            <span style={{ fontWeight: 600 }}>{title}の設定</span>
            {isEnabled && <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--color-primary)', color: '#000', borderRadius: '4px' }}>スケジュール有効</span>}
          </div>
          <span style={{ transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
        </div>
        
        {isExp && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
            <label className="toggle" style={{ marginBottom: '16px', display: 'flex' }}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => {
                  if (e.target.checked) {
                    updateInterval(type, 'mode', 'DYNAMIC_PACE');
                  } else {
                    clearInterval(type);
                  }
                }}
              />
              <span className="toggle-track" />
              <span className="toggle-label">確率ではなくスケジュール（間隔）で実行する</span>
            </label>

            {isEnabled && (
              <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--color-primary)', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="label">実行モード</label>
                  <select 
                    className="input-field"
                    value={config.mode}
                    onChange={e => updateInterval(type, 'mode', e.target.value)}
                  >
                    <option value="DYNAMIC_PACE">自動調整（ランダム間隔）</option>
                    <option value="FIXED_INTERVAL">固定間隔（n分ごと）</option>
                    <option value="SPECIFIC_TIMES">指定時刻</option>
                  </select>
                </div>

                {config.mode === 'FIXED_INTERVAL' && (
                  <div className="form-group">
                    <label className="label">実行間隔（分）</label>
                    <input 
                      type="number" className="input-field" min="5"
                      value={config.fixedIntervalMinutes || 60}
                      onChange={e => updateInterval(type, 'fixedIntervalMinutes', Number(e.target.value))}
                    />
                  </div>
                )}

                {config.mode === 'SPECIFIC_TIMES' && (
                  <div className="form-group">
                    <label className="label">指定時刻（HH:MM、カンマ区切り）</label>
                    <input 
                      type="text" className="input-field" placeholder="12:00, 18:30"
                      value={(config.specificTimes || []).join(', ')}
                      onChange={e => updateInterval(type, 'specificTimes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                )}

                {config.mode === 'DYNAMIC_PACE' && (
                  <div className="form-group">
                    <label className="label">最短実行間隔（秒）</label>
                    <input 
                      type="number" className="input-field" min="30"
                      value={config.minInterval || 30}
                      onChange={e => updateInterval(type, 'minInterval', Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ marginBottom: '20px' }}>
      <div className="section">
        <h2 className="section-title"><span>⚙️</span> アクションの詳細設定（スケジュール）</h2>
        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>
          通常は「確率コントロール」の設定に基づきランダムで実行されますが、ここでスケジュールを有効にすると、投稿と同じように指定した間隔で確実に実行させることができます。
        </p>

        {renderActionSettings('いいね', 'like', '❤️')}
        {renderActionSettings('引用リカロート', 'quote', '💬')}
        {renderActionSettings('リカロート', 'rekarot', '🔁')}
        {renderActionSettings('リプライ', 'reply', '↩️')}
        {renderActionSettings('リアクション', 'react', '✨')}

        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>✨ リアクションの絵文字設定</h3>
          
          <div className="form-group">
            <label className="label">リアクションの選び方</label>
            <select 
              className="input-field"
              value={reactionSettings.mode}
              onChange={e => setReactionSettings(prev => ({ ...prev, mode: e.target.value as 'AI' | 'RANDOM_FROM_LIST' }))}
            >
              <option value="AI">AIに文脈から最適なものを選ばせる</option>
              <option value="RANDOM_FROM_LIST">以下のリストからランダムに選ぶ</option>
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="label">利用する絵文字リスト（カンマ区切り）</label>
            <input 
              type="text" className="input-field"
              value={reactionSettings.list.join(', ')}
              onChange={e => setReactionSettings(prev => ({ ...prev, list: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
