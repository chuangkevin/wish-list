import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

export default function Header() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <header className="header">
      <div className="header-inner">
        <h1 className="header-title">
          <a href="/">女神的願望清單</a>
        </h1>
        <div className="header-right">
          <button className="btn-theme" onClick={toggle} title={dark ? '切換淺色' : '切換深色'}>
            {dark ? '☀️' : '🌙'}
          </button>
          {user && (
            <>
              <span className="header-user">{user.nickname}</span>
              <button className="btn-text" onClick={logout}>登出</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
