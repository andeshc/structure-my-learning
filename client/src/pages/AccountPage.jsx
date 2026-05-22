import { useEffect, useState } from 'react';
import * as accountApi from '../api/account';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const INPUT = 'mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700';

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-charcoal/10 bg-white p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);

  const [providers, setProviders] = useState(null);
  useEffect(() => {
    apiRequest('/api/account').then((data) => setProviders(data.user.providers)).catch(() => null);
  }, []);
  const hasPassword = providers?.includes('password') ?? true;

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    setNameSaving(true);
    try {
      const data = await accountApi.updateProfile({ name });
      updateUser(data.user);
      showToast({ type: 'success', message: 'Name updated.' });
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setNameSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await accountApi.updateProfile({
        currentPassword: pwForm.currentPassword || undefined,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProviders((p) => p && !p.includes('password') ? [...p, 'password'] : p);
      showToast({ type: 'success', message: 'Password updated.' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>

      <Section title="Profile">
        <form onSubmit={saveName} className="space-y-4">
          <label className="block text-sm font-medium">
            Name
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input className={`${INPUT} bg-charcoal/5 text-charcoal-400`} value={user?.email ?? ''} disabled />
          </label>
          <button
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={nameSaving || name === user?.name}
          >
            {nameSaving ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </Section>

      <Section title="Password">
        <form onSubmit={savePassword} className="space-y-4">
          {!hasPassword && (
            <p className="text-sm text-charcoal-400">
              You haven't set a password yet. Set one below and you'll be able to log in with your email too.
              {user?.signupProvider !== 'password' && ` It won't affect your ${{ google: 'Google', github: 'GitHub' }[user?.signupProvider] ?? 'external'} account.`}
            </p>
          )}
          {hasPassword && (
            <label className="block text-sm font-medium">
              Current password
              <input className={INPUT} type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} autoComplete="current-password" required />
            </label>
          )}
          <label className="block text-sm font-medium">
            New password
            <input className={INPUT} type="password" minLength={8} value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} autoComplete="new-password" required />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input className={INPUT} type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} autoComplete="new-password" required />
          </label>
          {pwError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{pwError}</p>}
          <button
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={pwSaving}
          >
            {pwSaving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </Section>
    </section>
  );
}
