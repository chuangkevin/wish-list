import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_LABELS: Record<string, string> = {
  open: '待處理',
  in_progress: '處理中',
  resolved: '已解決',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '🔴 緊急',
  medium: '🟡 一般',
  low: '🟢 不急',
};

const STATUS_ACTIONS: Record<string, { next: string; label: string }[]> = {
  open: [{ next: 'in_progress', label: '開始處理' }],
  in_progress: [
    { next: 'resolved', label: '標記已解決' },
    { next: 'open', label: '退回待處理' },
  ],
  resolved: [{ next: 'open', label: '重新開啟' }],
};

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [commentText, setCommentText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: issue, isLoading: issueLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => api.getIssue(id!),
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api.getComments(id!),
    enabled: !!id,
  });

  // SSE for real-time updates
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem('token');
    const es = new EventSource(`/api/issues/${id}/events?token=${token}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_comment' || data.type === 'status_change') {
        queryClient.invalidateQueries({ queryKey: ['comments', id] });
        queryClient.invalidateQueries({ queryKey: ['issue', id] });
      }
    };

    return () => es.close();
  }, [id, queryClient]);

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.updateIssue(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (commentText.trim()) {
        await api.addComment(id!, commentText.trim());
      }
      if (pendingFiles.length > 0) {
        await api.uploadMedia(id!, pendingFiles);
      }
    },
    onSuccess: () => {
      setCommentText('');
      setPendingFiles([]);
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
  });

  // Clipboard paste handler
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        setPendingFiles((prev) => [...prev, ...files]);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (issueLoading) return <div className="loading">載入中...</div>;
  if (!issue) return <div className="empty">找不到該問題</div>;

  const canSubmit = commentText.trim() || pendingFiles.length > 0;

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate('/')}>
        ← 返回清單
      </button>

      <div className="issue-detail">
        <div className="issue-detail-header">
          <div className="issue-detail-meta">
            <span className={`status-badge status-${issue.status}`}>
              {STATUS_LABELS[issue.status]}
            </span>
            <span className="priority-badge">{PRIORITY_LABELS[issue.priority]}</span>
          </div>
          <h2>{issue.title}</h2>
          {issue.description && <p className="issue-description">{issue.description}</p>}
          <div className="issue-info">
            <span>提問者：{issue.authorNickname}</span>
            <span>{new Date(issue.createdAt).toLocaleString('zh-TW')}</span>
          </div>
        </div>

        {/* Status actions */}
        <div className="status-actions">
          {(STATUS_ACTIONS[issue.status] || []).map((action) => (
            <button
              key={action.next}
              className={`btn-status btn-status-${action.next}`}
              onClick={() => statusMutation.mutate(action.next)}
              disabled={statusMutation.isPending}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Issue media */}
        {issue.media && issue.media.length > 0 && (
          <div className="media-section">
            <h4>附件</h4>
            <div className="media-grid">
              {issue.media.map((m: any) => (
                <MediaItem key={m.id} media={m} onClickImage={setLightboxSrc} issueId={id!} />
              ))}
            </div>
          </div>
        )}

        {/* Comments section */}
        <div className="comments-section">
          <h4>留言 ({comments.length})</h4>
          <div className="comment-list">
            {comments.map((comment: any) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <strong>{comment.authorNickname}</strong>
                  <span className="comment-time">
                    {new Date(comment.createdAt).toLocaleString('zh-TW')}
                  </span>
                </div>
                <p className="comment-content">{comment.content}</p>
                {comment.media && comment.media.length > 0 && (
                  <div className="media-grid">
                    {comment.media.map((m: any) => (
                      <MediaItem key={m.id} media={m} onClickImage={setLightboxSrc} issueId={id!} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="comment-input">
            <textarea
              ref={commentInputRef}
              placeholder="輸入留言... (可直接貼上螢幕截圖)"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />

            {/* Pending files preview */}
            {pendingFiles.length > 0 && (
              <div className="pending-files">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="pending-file">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                    ) : (
                      <div className="file-icon">🎬</div>
                    )}
                    <span className="pending-file-name">{file.name}</span>
                    <button className="pending-file-remove" onClick={() => removePendingFile(i)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="comment-actions">
              <div className="comment-actions-left">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="上傳檔案"
                >
                  📎 上傳
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
              <button
                className="btn-primary"
                onClick={() => commentMutation.mutate()}
                disabled={!canSubmit || commentMutation.isPending}
              >
                {commentMutation.isPending ? '送出中...' : '送出'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox with zoom */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => Math.min(Math.max(prev + delta, 0.25), 8));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="lightbox"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="lightbox-toolbar">
        <button onClick={() => setScale((s) => Math.min(s + 0.25, 8))}>＋</button>
        <span className="lightbox-scale">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.max(s - 0.25, 0.25))}>－</button>
        <button onClick={resetView}>重置</button>
        <button onClick={onClose}>✕</button>
      </div>
      <img
        src={src}
        alt="preview"
        className="lightbox-image"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        draggable={false}
      />
    </div>
  );
}

function MediaItem({
  media,
  onClickImage,
  issueId,
}: {
  media: any;
  onClickImage: (src: string) => void;
  issueId: string;
}) {
  const src = `/${media.path}`;
  const isVideo = media.mimetype.startsWith('video/');
  const isImage = media.mimetype.startsWith('image/');

  if (isVideo) {
    return (
      <div className="media-item media-video">
        <video controls preload="metadata">
          <source src={src} type={media.mimetype} />
        </video>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="media-item media-image" onClick={() => onClickImage(src)}>
        <img src={src} alt={media.filename} loading="lazy" />
      </div>
    );
  }

  return null;
}
