import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../api/auth';
import Footer from '../components/Footer';
import Logo from '../components/Logo';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage({ mode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', referralSource: '', referralSourceOther: '' });
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegister) {
        const result = await auth.signUp(form);
        if (result?.pendingVerification) {
          setPendingVerification(true);
          return;
        }
      } else {
        await auth.signIn({ email: form.email, password: form.password });
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (submitError) {
      if (submitError.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(form.email);
      }
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResendSent(false);
    const email = unverifiedEmail || form.email;
    await resendVerification(email).catch(() => null);
    setResendSent(true);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas px-4 py-10">
      {/* Fine-line grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(15,118,110,0.12) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(15,118,110,0.12) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'linear-gradient(to bottom right, black 30%, transparent 80%)',
          maskImage: 'linear-gradient(to bottom right, black 30%, transparent 80%)',
        }}
      />
      {/* Color blooms */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-20 h-[560px]"
        style={{
          background: [
            'radial-gradient(ellipse 55% 70% at 10% 0%, rgba(99,102,241,0.11) 0%, transparent 60%)',
            'radial-gradient(ellipse 70% 90% at 40% 0%, rgba(15,118,110,0.10) 0%, transparent 65%)',
            'radial-gradient(ellipse 40% 55% at 75% 5%, rgba(251,146,60,0.08) 0%, transparent 55%)',
          ].join(', '),
        }}
      />

      {/* Decorative pill stack — brand motif, top-right */}
      <div className="pointer-events-none absolute -right-10 -top-6 opacity-[0.07]">
        <svg viewBox="0 0 104 73" className="w-80" aria-hidden="true">
          <rect x="54" y="0"  width="50" height="21" rx="10.5" fill="#0F766E"/>
          <rect x="27" y="26" width="50" height="21" rx="10.5" fill="#0F766E"/>
          <rect x="0"  y="52" width="50" height="21" rx="10.5" fill="#0F766E"/>
        </svg>
      </div>
      <div className="relative mx-auto grid flex-1 max-w-6xl w-full items-center gap-10 md:grid-cols-[1fr_420px]">
        <section>
          <Link to="/"><Logo className="h-10 w-auto" /></Link>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-charcoal md:text-6xl">
            Turn any learning goal into{' '}
            <span className="bg-gradient-to-r from-teal-600 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">
              a guide built just for you.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal-400">
            Type what you're curious about. Get a complete, structured learning guide — with real depth on every topic. Like a tutor who wrote a mini-course, just for you.
          </p>
        </section>

        <section className="rounded-lg border border-charcoal/10 bg-white p-6">
          {pendingVerification ? (
            <div className="text-center py-4">
              <p className="text-2xl font-semibold text-charcoal">Check your email</p>
              <p className="mt-3 text-sm text-charcoal-400">
                We sent a verification link to <strong>{form.email}</strong>. Click it to activate your account.
              </p>
              <p className="mt-6 text-sm text-charcoal-400">
                Didn't receive it?{' '}
                {resendSent
                  ? <span className="text-teal-700">Sent! Check your inbox.</span>
                  : <button className="font-medium text-teal-700 hover:underline" onClick={handleResend}>Resend email</button>
                }
              </p>
            </div>
          ) : (
          <>
          <h2 className="text-2xl font-semibold">{isRegister ? 'Create account' : 'Welcome back'}</h2>
          <p className="mt-2 text-sm text-charcoal-400">
            {isRegister ? 'Three free guides to start. No credit card required.' : 'Welcome back. Pick up where you left off.'}
          </p>

          <div className="mt-6 grid gap-2">
            <a className="flex items-center justify-center gap-2.5 rounded-md border border-charcoal/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-charcoal/5" href="/api/auth/google">
              <GoogleIcon /> Login with Google
            </a>
            <a className="flex items-center justify-center gap-2.5 rounded-md border border-charcoal/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-charcoal/5" href="/api/auth/github">
              <GitHubIcon /> Login with GitHub
            </a>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-charcoal/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-charcoal-200">OR</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <label className="block text-sm font-medium">
                Name
                <input className="mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="name" value={form.name} onChange={updateField} required />
              </label>
            )}
            <label className="block text-sm font-medium">
              Email
              <input className="mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="email" type="email" value={form.email} onChange={updateField} required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input className="mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="password" type="password" minLength="8" value={form.password} onChange={updateField} required />
            </label>
            {isRegister && (
              <label className="block text-sm font-medium">
                Where did you hear about us?
                <select className="mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700 bg-white" name="referralSource" value={form.referralSource} onChange={updateField} required>
                  <option value="" disabled>Select one…</option>
                  <optgroup label="Search">
                    <option value="google">Google Search</option>
                    <option value="bing">Bing / other search engine</option>
                  </optgroup>
                  <optgroup label="Social Media">
                    <option value="twitter_x">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="reddit">Reddit</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                  </optgroup>
                  <optgroup label="Content">
                    <option value="blog">Blog post or article</option>
                    <option value="newsletter">Newsletter or email</option>
                    <option value="podcast">Podcast</option>
                  </optgroup>
                  <optgroup label="Word of Mouth">
                    <option value="friend">Friend or colleague</option>
                  </optgroup>
                  <optgroup label="Professional">
                    <option value="employer">My employer / workplace</option>
                    <option value="school">School or university</option>
                  </optgroup>
                  <optgroup label="Directories">
                    <option value="product_hunt">Product Hunt</option>
                  </optgroup>
                  <option value="other">Other…</option>
                </select>
              </label>
            )}
            {isRegister && form.referralSource === 'other' && (
              <label className="block text-sm font-medium">
                Please tell us more
                <input className="mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="referralSourceOther" value={form.referralSourceOther} onChange={updateField} maxLength={300} required />
              </label>
            )}
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{error}</p>
                {unverifiedEmail && (
                  <p className="mt-1">
                    {resendSent
                      ? 'Email sent — check your inbox.'
                      : <button className="font-medium underline" onClick={handleResend}>Resend verification email</button>
                    }
                  </p>
                )}
              </div>
            )}
            <button className="w-full rounded-md bg-charcoal px-4 py-2.5 font-medium text-white disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? 'Working...' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-5 text-sm text-charcoal-400">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <Link className="font-medium text-teal-700" to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Create one'}
            </Link>
          </p>
          </>
          )}
        </section>
      </div>
      <Footer className="border-t border-charcoal/10" />
    </div>
  );
}
