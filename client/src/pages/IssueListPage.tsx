import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'open', label: '待處理' },
  { key: 'in_progress', label: '處理中' },
  { key: 'resolved', label: '已解決' },
];

const PRIORITY_LABELS: Record<string, string> = {
  high: '🔴 緊急',
  medium: '🟡 一般',
  low: '🟢 不急',
};

const STATUS_LABELS: Record<string, string> = {
  open: '待處理',
  in_progress: '處理中',
  resolved: '已解決',
};

export default function IssueListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues', activeTab],
    queryFn: () => api.listIssues(activeTab || undefined),
  });

  return (
    <div className="page">
      <div className="page-header">
        <h2>問題清單</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + 新增問題
        </button>
      </div>

      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="loading">載入中...</div>
      ) : issues.length === 0 ? (
        <div className="empty">
          <p>還沒有問題，點右上角新增吧！</p>
        </div>
      ) : (
        <div className="issue-list">
          {issues.map((issue: any) => (
            <div
              key={issue.id}
              className="issue-card"
              onClick={() => navigate(`/issues/${issue.id}`)}
            >
              <div className="issue-card-header">
                <span className={`status-badge status-${issue.status}`}>
                  {STATUS_LABELS[issue.status]}
                </span>
                <span className="priority-badge">
                  {PRIORITY_LABELS[issue.priority]}
                </span>
              </div>
              <h3 className="issue-card-title">{issue.title}</h3>
              {issue.description && (
                <p className="issue-card-desc">{issue.description}</p>
              )}
              <div className="issue-card-meta">
                <span>{issue.authorNickname}</span>
                <span>{new Date(issue.createdAt).toLocaleDateString('zh-TW')}</span>
                <span>💬 {issue.commentCount}</span>
                {issue.mediaCount > 0 && <span>📎 {issue.mediaCount}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateIssueModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ['issues'] });
          }}
        />
      )}
    </div>
  );
}

function CreateIssueModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.createIssue({ title, description, priority }),
    onSuccess: () => onCreated(),
    onError: (err: any) => setError(err.message),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>新增問題</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="form-group">
            <label>問題標題</label>
            <input
              type="text"
              placeholder="簡述遇到的問題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>詳細描述</label>
            <textarea
              placeholder="描述問題的細節（選填）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>優先級</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">🔴 緊急</option>
              <option value="medium">🟡 一般</option>
              <option value="low">🟢 不急</option>
            </select>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!title.trim() || mutation.isPending}
            >
              {mutation.isPending ? '建立中...' : '建立'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
