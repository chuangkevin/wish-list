import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function LoginForm() {
  const { register, loginAs } = useAuth();
  const [users, setUsers] = useState<{ id: string; nickname: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listUsers().then((list) => {
      setUsers(list);
      if (list.length === 0) setShowCreate(true);
    }).catch(() => {});
  }, []);

  const handleLogin = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      await loginAs(userId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    setError('');
    try {
      await register(nickname.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>女神的願望清單</h1>
        <p className="login-subtitle">有什麼困難，跟我說</p>

        {error && <p className="error">{error}</p>}

        {!showCreate ? (
          <>
            {users.length > 0 && (
              <div className="user-list">
                <p className="user-list-label">選擇你的身份</p>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="user-item"
                    onClick={() => handleLogin(u.id)}
                    disabled={loading}
                  >
                    <span className="user-avatar">{u.nickname[0]}</span>
                    <span>{u.nickname}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn-create-user"
              onClick={() => setShowCreate(true)}
            >
              + 建立新使用者
            </button>
          </>
        ) : (
          <form onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="請輸入你的暱稱"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              autoFocus
              disabled={loading}
            />
            <button type="submit" className="btn-primary" disabled={loading || !nickname.trim()}>
              {loading ? '建立中...' : '建立並登入'}
            </button>
            {users.length > 0 && (
              <button
                type="button"
                className="btn-text"
                onClick={() => { setShowCreate(false); setError(''); }}
              >
                ← 返回選擇使用者
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
