import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setToken, clearToken } from './api';

interface User {
  id: string;
  nickname: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (nickname: string) => Promise<void>;
  loginAs: (id: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const register = async (nickname: string) => {
    const result = await api.register(nickname);
    setToken(result.token);
    setUser({ id: result.id, nickname: result.nickname });
  };

  const loginAs = async (id: string) => {
    const result = await api.loginAs(id);
    setToken(result.token);
    setUser({ id: result.id, nickname: result.nickname });
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
