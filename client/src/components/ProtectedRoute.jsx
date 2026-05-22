import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-sm text-charcoal-400">
        Loading your workspace...
      </div>
    );
  }

  if (auth.status === 'error') {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 text-sm text-charcoal-400">
        <p>Could not connect to the server. Please try again.</p>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (auth.needsOnboarding) {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
}
