import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', referralSource: '', referralSourceOther: '' });
  const [error, setError] = useState('');
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
        await auth.signUp(form);
      } else {
        await auth.signIn({ email: form.email, password: form.password });
      }

      navigate(location.state?.from || '/', { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 md:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">StructureMyLearning</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-charcoal md:text-6xl">
            Build a personal course from a single learning goal.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal-400">
            Create structured guides, read generated lessons, and track progress through each topic.
          </p>
        </section>

        <section className="rounded-lg border border-charcoal/10 bg-white p-6">
          <h2 className="text-2xl font-semibold">{isRegister ? 'Create account' : 'Welcome back'}</h2>
          <p className="mt-2 text-sm text-charcoal-400">
            {isRegister ? 'Start building your learning library.' : 'Sign in to continue learning.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="w-full rounded-md bg-charcoal px-4 py-2.5 font-medium text-white disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? 'Working...' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-5 grid gap-2">
            <a className="rounded-md border border-charcoal/15 px-4 py-2 text-center text-sm font-medium" href="/api/auth/google">Continue with Google</a>
            <a className="rounded-md border border-charcoal/15 px-4 py-2 text-center text-sm font-medium" href="/api/auth/github">Continue with GitHub</a>
          </div>

          <p className="mt-5 text-sm text-charcoal-400">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <Link className="font-medium text-teal-700" to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Create one'}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
