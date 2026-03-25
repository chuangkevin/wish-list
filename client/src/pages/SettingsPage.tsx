import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (推薦)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (高品質)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (舊版)' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [batchText, setBatchText] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [error, setError] = useState('');

  const { data: keyData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: api.getApiKeys,
  });

  const { data: usage } = useQuery({
    queryKey: ['token-usage'],
    queryFn: api.getTokenUsage,
  });

  const addMutation = useMutation({
    mutationFn: (key: string) => api.addApiKey(key),
    onSuccess: () => {
      setNewKey('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: any) => setError(err.message),
  });

  const batchMutation = useMutation({
    mutationFn: (text: string) => api.batchImportKeys(text),
    onSuccess: () => {
      setBatchText('');
      setShowBatch(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (suffix: string) => api.deleteApiKey(suffix),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const modelMutation = useMutation({
    mutationFn: (model: string) => api.updateModel(model),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate('/')}>← 返回</button>
      <h2>設定</h2>

      {/* Model Selection */}
      <section className="settings-section">
        <h3>AI 模型</h3>
        <select
          value={keyData?.model || 'gemini-2.5-flash'}
          onChange={(e) => modelMutation.mutate(e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </section>

      {/* API Keys */}
      <section className="settings-section">
        <h3>Gemini API Keys</h3>

        {isLoading ? (
          <div className="loading">載入中...</div>
        ) : (
          <>
            {keyData?.keys && keyData.keys.length > 0 && (
              <div className="key-list">
                {keyData.keys.map((k: any) => (
                  <div key={k.suffix} className="key-item">
                    <div className="key-info">
                      <span className="key-suffix">...{k.suffix}</span>
                      {k.fromEnv && <span className="key-badge">ENV</span>}
                      <span className="key-stats">今日 {k.todayCalls} 次 / {k.todayTokens} tokens</span>
                    </div>
                    <button
                      className="btn-text btn-danger"
                      onClick={() => deleteMutation.mutate(k.suffix)}
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add single key */}
            <div className="key-add">
              <input
                type="text"
                placeholder="輸入 Gemini API Key (AIza...)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={() => addMutation.mutate(newKey)}
                disabled={!newKey.trim() || addMutation.isPending}
              >
                {addMutation.isPending ? '驗證中...' : '新增'}
              </button>
            </div>

            {/* Batch import */}
            <button className="btn-text" onClick={() => setShowBatch(!showBatch)}>
              {showBatch ? '收起' : '批次匯入'}
            </button>
            {showBatch && (
              <div className="key-batch">
                <textarea
                  placeholder="每行一把 Key，以 AIza 開頭的行會被匯入"
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={5}
                />
                <button
                  className="btn-primary"
                  onClick={() => batchMutation.mutate(batchText)}
                  disabled={!batchText.trim() || batchMutation.isPending}
                >
                  匯入
                </button>
              </div>
            )}
          </>
        )}

        {error && <p className="error">{error}</p>}
      </section>

      {/* Usage Stats */}
      {usage && (
        <section className="settings-section">
          <h3>使用量統計</h3>
          <div className="usage-grid">
            <div className="usage-card">
              <div className="usage-label">今日</div>
              <div className="usage-value">{usage.today.calls} 次</div>
              <div className="usage-tokens">{usage.today.tokens.toLocaleString()} tokens</div>
            </div>
            <div className="usage-card">
              <div className="usage-label">近 7 天</div>
              <div className="usage-value">{usage.week.calls} 次</div>
              <div className="usage-tokens">{usage.week.tokens.toLocaleString()} tokens</div>
            </div>
            <div className="usage-card">
              <div className="usage-label">近 30 天</div>
              <div className="usage-value">{usage.month.calls} 次</div>
              <div className="usage-tokens">{usage.month.tokens.toLocaleString()} tokens</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
