import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    refresh()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setError('OAuth sign-in failed. Please try again.'));
  }, [navigate, refresh]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="rounded-lg border border-line bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-black uppercase text-primary">Signing you in</p>
        <h1 className="mt-2 text-3xl font-black">{error || 'Finishing OAuth...'}</h1>
      </div>
    </main>
  );
}
