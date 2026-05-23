import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AccountPage from './pages/AccountPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import GuideDetailPage from './pages/GuideDetailPage';
import NewGuidePage from './pages/NewGuidePage';
import NotFoundPage from './pages/NotFoundPage';
import SubtopicDetailPage from './pages/SubtopicDetailPage';
import WelcomePage from './pages/WelcomePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="guides/new" element={<NewGuidePage />} />
                  <Route path="guides/:guideId" element={<GuideDetailPage />} />
                  <Route path="topics/:topicId/subtopics/:position" element={<SubtopicDetailPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
