import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { GuideDetailPage } from './pages/GuideDetailPage';
import { NewGuidePage } from './pages/NewGuidePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TopicDetailPage } from './pages/TopicDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/guides/new" element={<NewGuidePage />} />
          <Route path="/guides/:guideId" element={<GuideDetailPage />} />
          <Route path="/guides/:guideId/topics/:topicId" element={<TopicDetailPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
