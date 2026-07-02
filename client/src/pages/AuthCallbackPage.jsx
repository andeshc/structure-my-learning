import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';

// Only follow relative in-app paths — never an absolute/protocol-relative URL.
function safeNextPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

export default function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    const nextPath = safeNextPath(searchParams.get('next'));
    auth.refreshFromCookie()
      .then((user) => {
        if (!user.referralSource) {
          navigate(nextPath ? `/welcome?next=${encodeURIComponent(nextPath)}` : '/welcome', { replace: true });
          return;
        }
        navigate(nextPath || '/', { replace: true });
      })
      .catch(() => setMessage('We could not finish sign in. Please try again.'));
  }, [auth, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center text-charcoal-400">
      {message}
    </div>
  );
}
