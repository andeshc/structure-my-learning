import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setErrorMsg('No verification token found.');
      setStatus('error');
      return;
    }

    auth.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Verification failed.');
        setStatus('error');
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-charcoal/10 bg-white p-8 text-center">
        <Link to="/"><Logo className="mx-auto h-9 w-auto" /></Link>

        {status === 'verifying' && (
          <>
            <span className="mt-6 inline-block h-7 w-7 animate-spin rounded-full border-4 border-charcoal/10 border-t-teal-700" />
            <p className="mt-4 font-semibold text-charcoal">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="mt-6 text-3xl">✓</p>
            <p className="mt-3 font-semibold text-charcoal">Email verified!</p>
            <p className="mt-1 text-sm text-charcoal-400">Taking you to the app…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="mt-6 font-semibold text-charcoal">Verification failed</p>
            <p className="mt-2 text-sm text-charcoal-400">{errorMsg}</p>
            <a className="mt-5 inline-block text-sm font-medium text-teal-700 hover:underline" href="/register">
              Back to sign up
            </a>
          </>
        )}
      </div>
    </div>
  );
}
