import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import * as accountApi from '../api/account';
import { useAuth } from '../context/AuthContext';

const INPUT = 'mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700';

export default function WelcomePage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: auth.user?.name ?? '',
    referralSource: '',
    referralSourceOther: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (!auth.needsOnboarding) return <Navigate to="/" replace />;

  function updateField(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        referralSource: form.referralSource,
        referralSourceOther: form.referralSource === 'other' ? form.referralSourceOther : undefined,
        password: form.password || undefined,
      };
      const data = await accountApi.setup(payload);
      auth.updateUser(data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">StructureMyLearning</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-charcoal">
          Welcome, {auth.user?.name?.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-sm text-charcoal-400">Just a couple of things before you start.</p>

        <form className="mt-6 rounded-lg border border-charcoal/10 bg-white p-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Your name
            <input className={INPUT} name="name" value={form.name} onChange={updateField} required />
          </label>

          <label className="block text-sm font-medium">
            Where did you hear about us?
            <select className={`${INPUT} bg-white`} name="referralSource" value={form.referralSource} onChange={updateField} required>
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

          {form.referralSource === 'other' && (
            <label className="block text-sm font-medium">
              Please tell us more
              <input className={INPUT} name="referralSourceOther" value={form.referralSourceOther} onChange={updateField} maxLength={300} required />
            </label>
          )}

          <div className="border-t border-charcoal/10 pt-4">
            <p className="text-sm font-medium">Set a password <span className="font-normal text-charcoal-400">(optional)</span></p>
            <p className="mt-1 text-xs text-charcoal-400">This is your StructureMyLearning password — it won't affect your Google or GitHub account.</p>
            <label className="mt-3 block text-sm font-medium">
              Password
              <input className={INPUT} name="password" type="password" minLength={8} value={form.password} onChange={updateField} autoComplete="new-password" />
            </label>
            {form.password && (
              <label className="mt-3 block text-sm font-medium">
                Confirm password
                <input className={INPUT} name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" />
              </label>
            )}
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            className="w-full rounded-md bg-charcoal px-4 py-2.5 font-medium text-white disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
