import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import Header from './components/Header';
import LoginForm from './components/LoginForm';
import IssueListPage from './pages/IssueListPage';
import IssueDetailPage from './pages/IssueDetailPage';
import SettingsPage from './pages/SettingsPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">載入中...</div>;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<IssueListPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <div className="app">
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}
