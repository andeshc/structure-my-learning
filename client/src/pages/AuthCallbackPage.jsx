import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    auth.refreshFromCookie()
      .then(() => navigate('/', { replace: true }))
      .catch(() => setMessage('We could not finish sign in. Please try again.'));
  }, [auth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center text-charcoal-400">
      {message}
    </div>
  );
}
