import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { oauthUrl } from '../api/auth';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const auth = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (isRegister && form.password !== form.confirmPassword) {
      setError('Passwords must match.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await auth.register({ name: form.name, email: form.email, password: form.password });
      } else {
        await auth.login({ email: form.email, password: form.password });
      }
      showToast(isRegister ? 'Account created.' : 'Logged in.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-8">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-lg border border-line bg-white shadow-soft lg:grid-cols-[1fr_420px]">
        <div className="hidden bg-gradient-to-br from-blue-50 via-white to-amber/10 p-10 lg:flex lg:flex-col lg:justify-between">
          <BrandMark />
          <div>
            <h1 className="text-5xl font-black tracking-tight text-ink">
              Learn anything with a guide that feels made for you.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Turn a plain-language goal into topics, lessons, and progress you can actually finish.
            </p>
          </div>
          <div className="rounded-lg border border-amber/40 bg-white p-5 shadow-soft">
            <p className="text-sm font-black uppercase text-amber">Recent guide preview</p>
            <h2 className="mt-2 text-xl font-black">Transformer Architecture</h2>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div className="h-2 w-5/12 rounded-full bg-progress" />
            </div>
            <p className="mt-2 text-sm text-slate-500">4 of 9 topics complete</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-sm font-black uppercase text-primary">{isRegister ? 'Create account' : 'Welcome back'}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">{isRegister ? 'Save your guides' : 'Log in to continue'}</h2>

          {isRegister && (
            <label className="mt-6 block text-sm font-bold text-slate-700">
              Name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                className="mt-2 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-primary"
                required
              />
            </label>
          )}

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              className="mt-2 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-primary"
              required
            />
          </label>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              className="mt-2 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-primary"
              required
            />
          </label>

          {isRegister && (
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateField}
                className="mt-2 h-12 w-full rounded-lg border border-line px-4 outline-none focus:border-primary"
                required
              />
            </label>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 h-12 w-full rounded-lg bg-primary font-black text-white shadow-soft disabled:opacity-60"
          >
            {submitting ? 'Working...' : isRegister ? 'Create account' : 'Log in'}
          </button>

          <div className="my-6 flex items-center gap-3 text-sm font-bold text-slate-400">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid gap-3">
            <a className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line font-black" href={oauthUrl('google')}>
              G Continue with Google
            </a>
            <a className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line font-black" href={oauthUrl('github')}>
              <span className="text-sm">GH</span>
              Continue with GitHub
            </a>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegister ? 'Already registered?' : 'New here?'}{' '}
            <Link className="font-black text-primary" to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Create account'}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
