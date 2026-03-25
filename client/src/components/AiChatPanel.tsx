import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface Props {
  issueId: string;
}

export default function AiChatPanel({ issueId }: Props) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['ai-chat', issueId],
    queryFn: () => api.getAiChat(issueId),
    enabled: isOpen,
  });

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendAiChat(issueId, message),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['ai-chat', issueId] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api.clearAiChat(issueId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-chat', issueId] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendMutation.isPending]);

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button className="ai-chat-toggle" onClick={() => setIsOpen(true)}>
        🤖 AI 助手
      </button>
    );
  }

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <span>🤖 AI 助手</span>
        <div className="ai-chat-header-actions">
          {messages.length > 0 && (
            <button
              className="btn-text"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              清除
            </button>
          )}
          <button className="btn-text" onClick={() => setIsOpen(false)}>✕</button>
        </div>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && !sendMutation.isPending && (
          <div className="ai-chat-empty">
            <p>👋 我是 AI 助手，可以分析這個問題並給你建議。</p>
            <p>我會讀取問題的描述、附件圖片和留言討論。</p>
            <div className="ai-chat-suggestions">
              <button onClick={() => { setInput('分析這個問題並給我建議'); }}>
                分析問題
              </button>
              <button onClick={() => { setInput('這個問題可能的原因是什麼？'); }}>
                找原因
              </button>
              <button onClick={() => { setInput('請根據附件截圖分析問題'); }}>
                分析截圖
              </button>
            </div>
          </div>
        )}

        {messages.map((msg: any) => (
          <div key={msg.id} className={`ai-chat-msg ai-chat-msg-${msg.role}`}>
            <div className="ai-chat-msg-role">
              {msg.role === 'user' ? '你' : '🤖 AI'}
            </div>
            <div className="ai-chat-msg-content">{msg.content}</div>
          </div>
        ))}

        {sendMutation.isPending && (
          <div className="ai-chat-msg ai-chat-msg-assistant">
            <div className="ai-chat-msg-role">🤖 AI</div>
            <div className="ai-chat-msg-content ai-thinking">思考中...</div>
          </div>
        )}

        {sendMutation.isError && (
          <div className="ai-chat-error">
            {(sendMutation.error as any)?.message || 'AI 回覆失敗'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="問 AI 助手..."
          rows={2}
          disabled={sendMutation.isPending}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
        >
          送出
        </button>
      </div>
    </div>
  );
}
