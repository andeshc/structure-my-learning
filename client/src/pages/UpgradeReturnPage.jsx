import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const MAX_ATTEMPTS = 15;
const POLL_INTERVAL = 2000;

export default function UpgradeReturnPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('polling'); // polling | success | timeout
  const pollRef = useRef(null);

  useEffect(() => {
    if (user?.plan && user.plan !== 'free') {
      setStatus('success');
      const t = setTimeout(() => navigate('/account', { replace: true }), 1500);
      return () => clearTimeout(t);
    }

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const data = await fetchMe();
        if (data.user?.plan && data.user.plan !== 'free') {
          clearInterval(pollRef.current);
          updateUser(data.user);
          setStatus('success');
          setTimeout(() => navigate('/account', { replace: true }), 1500);
          return;
        }
      } catch {
        // continue polling
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(pollRef.current);
        setStatus('timeout');
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-charcoal/10 text-center">
        {status === 'polling' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-teal-700/20 border-t-teal-700" />
            <p className="font-medium text-charcoal">Activating your plan…</p>
            <p className="mt-1 text-sm text-charcoal-400">This usually takes a few seconds.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-700/10">
              <svg className="h-6 w-6 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium text-charcoal">You're all set!</p>
            <p className="mt-1 text-sm text-charcoal-400">Redirecting to your account…</p>
          </>
        )}
        {status === 'timeout' && (
          <>
            <p className="font-medium text-charcoal">Payment received</p>
            <p className="mt-1 text-sm text-charcoal-400">
              Your plan is taking a moment to activate. Check your account in a minute.
            </p>
            <button
              onClick={() => navigate('/account', { replace: true })}
              className="mt-4 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Go to account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
