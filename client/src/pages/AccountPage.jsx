import { BadgeCheck, Crown, KeyRound, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as accountApi from '../api/account';
import { cancelSubscription } from '../api/account';
import { apiRequest } from '../api/client';
import { resendVerification } from '../api/auth';
import UpgradeModal from '../components/UpgradeModal';
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

function ProfileSection({ user, updateUser, showToast }) {
  const [name, setName] = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

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

  async function handleResendVerification() {
    try {
      await resendVerification(user.email);
      setVerificationSent(true);
      showToast({ type: 'success', message: 'Verification email sent.' });
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  }

  const initials = (user?.name ?? '?')[0].toUpperCase();

  return (
    <Section title="Profile">
      <div className="flex items-center gap-4 mb-5">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-teal-700/15 flex items-center justify-center text-teal-700 text-xl font-semibold select-none">
            {initials}
          </div>
        )}
        <div>
          <p className="font-medium">{user?.name}</p>
          <p className="text-sm text-charcoal-400">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={saveName} className="space-y-4">
        <label className="block text-sm font-medium">
          Name
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <div>
          <span className="block text-sm font-medium mb-2">Email</span>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              className={`${INPUT} mt-0 flex-1 min-w-0 bg-charcoal/5 text-charcoal-400`}
              value={user?.email ?? ''}
              disabled
            />
            {user?.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-700/15 px-2.5 py-1 text-xs font-semibold text-teal-700 whitespace-nowrap">
                <BadgeCheck size={12} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 whitespace-nowrap">
                <ShieldAlert size={12} /> Unverified
                {!verificationSent ? (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="ml-1 underline hover:no-underline"
                  >
                    Resend
                  </button>
                ) : (
                  <span className="ml-1 font-normal">— check your inbox</span>
                )}
              </span>
            )}
          </div>
        </div>

        <button
          className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={nameSaving || name === user?.name}
        >
          {nameSaving ? 'Saving…' : 'Save name'}
        </button>
      </form>
    </Section>
  );
}

function BillingSection({ user, showToast }) {
  const [billing, setBilling] = useState(null);
  const [billingError, setBillingError] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelState, setCancelState] = useState('idle'); // idle | confirm | loading | done

  useEffect(() => {
    setBillingError(false);
    accountApi.getBilling()
      .then(setBilling)
      .catch(() => setBillingError(true));
  }, [user?.plan]);

  async function handleCancel() {
    setCancelState('loading');
    try {
      await cancelSubscription();
      showToast({ type: 'success', message: 'Your plan will cancel at the end of the billing period.' });
      setCancelState('done');
      accountApi.getBilling().then(setBilling).catch(() => {});
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Could not cancel subscription.' });
      setCancelState('idle');
    }
  }

  function formatDate(ts) {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const plan = billing?.plan ?? user?.plan ?? 'free';

  return (
    <Section title="Plan & billing">
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {!billing && !billingError && (
        <p className="text-sm text-charcoal-400">Loading…</p>
      )}

      {(billing || billingError) && plan === 'free' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-charcoal/10 px-2.5 py-1 text-xs font-semibold text-charcoal-400">Free</span>
          </div>

          {billing && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-charcoal-400">
                  {billing.guidesCreatedCount} of {billing.guideLimit} guides used
                </span>
                <span className="text-xs text-charcoal-400">{Math.max(0, billing.guideLimit - billing.guidesCreatedCount)} remaining</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-charcoal/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    billing.guidesCreatedCount >= billing.guideLimit
                      ? 'bg-red-500'
                      : billing.guidesCreatedCount >= billing.guideLimit * 0.67
                      ? 'bg-amber-500'
                      : 'bg-teal-700'
                  }`}
                  style={{ width: `${Math.min(100, (billing.guidesCreatedCount / billing.guideLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 transition-colors"
          >
            <Sparkles size={14} /> Upgrade to Pro
          </button>
        </div>
      )}

      {(billing || billingError) && plan === 'pro' && (() => {
        const sub = billing?.subscription;
        const isCancelled = sub?.cancelled;
        const periodEnd = sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : null;
        return (
          <div className="space-y-4">
            {/* Badge row */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-700/15 px-2.5 py-1 text-xs font-semibold text-teal-700">Pro</span>
              {isCancelled
                ? <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">Cancels at period end</span>
                : <span className="rounded-full bg-teal-700/10 px-2.5 py-1 text-xs font-medium text-teal-700">Active</span>
              }
            </div>

            {/* Feature list */}
            <ul className="space-y-1.5">
              {['Unlimited guides', 'AI tutor · generous use', 'All learning levels & depths'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-charcoal-400">
                  <svg className="h-3.5 w-3.5 text-teal-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* Footer: date + cancel action */}
            <div className="flex flex-wrap items-center justify-between gap-y-2 pt-1 border-t border-charcoal/8">
              <p className="text-sm text-charcoal-400">
                {isCancelled && periodEnd
                  ? <><span className="font-medium text-charcoal">Pro access until</span>{' '}<span style={{WebkitTextDecorationLine:'none',textDecorationLine:'none'}}>{periodEnd}</span></>
                  : periodEnd
                  ? <>Renews on{' '}<span style={{WebkitTextDecorationLine:'none',textDecorationLine:'none'}}>{periodEnd}</span></>
                  : null}
              </p>

              {!isCancelled && (
                <div className="flex items-center gap-3">
                  {cancelState === 'idle' && (
                    <button
                      onClick={() => setCancelState('confirm')}
                      className="text-sm text-charcoal-400 hover:text-red-600 transition-colors"
                    >
                      Cancel subscription
                    </button>
                  )}
                  {cancelState === 'confirm' && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-charcoal-400">Are you sure?</span>
                      <button onClick={handleCancel} className="text-sm font-medium text-red-600 hover:underline">Yes, cancel</button>
                      <button onClick={() => setCancelState('idle')} className="text-sm text-charcoal-400 hover:underline">Keep plan</button>
                    </div>
                  )}
                  {cancelState === 'loading' && (
                    <span className="text-sm text-charcoal-400">Cancelling…</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {(billing || billingError) && plan === 'ltd' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-teal-700" />
            <span className="rounded-full bg-teal-700/15 px-2.5 py-1 text-xs font-semibold text-teal-700">Lifetime</span>
          </div>
          <p className="text-sm text-charcoal-400">One-time purchase — unlimited guides forever.</p>
        </div>
      )}
    </Section>
  );
}

function SecuritySection({ user, showToast }) {
  const [providers, setProviders] = useState(null);
  useEffect(() => {
    apiRequest('/api/account').then((data) => setProviders(data.user.providers)).catch(() => null);
  }, []);
  const hasPassword = providers?.includes('password') ?? true;

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

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

  const PROVIDER_LABELS = {
    password: { label: 'Password', icon: <KeyRound size={12} /> },
    google: { label: 'Google', icon: null },
    github: { label: 'GitHub', icon: null },
    linkedin: { label: 'LinkedIn', icon: null },
    apple: { label: 'Apple', icon: null },
    facebook: { label: 'Facebook', icon: null },
    microsoft: { label: 'Microsoft', icon: null },
  };

  return (
    <Section title="Sign-in & security">
      {providers && providers.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-medium mb-2">Connected accounts</p>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => {
              const meta = PROVIDER_LABELS[p] ?? { label: p, icon: null };
              return (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 px-2.5 py-1 text-xs font-medium text-charcoal-400"
                >
                  {meta.icon}
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={savePassword} className="space-y-4">
        <p className="text-sm font-medium">Password</p>
        {!hasPassword && (
          <p className="text-sm text-charcoal-400">
            You haven't set a password yet. Set one below and you'll be able to log in with your email too.
            {user?.signupProvider !== 'password' && ` It won't affect your ${PROVIDER_LABELS[user?.signupProvider]?.label ?? 'external'} account.`}
          </p>
        )}
        {hasPassword && (
          <label className="block text-sm font-medium">
            Current password
            <input
              className={INPUT}
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              autoComplete="current-password"
              required
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          New password
          <input
            className={INPUT}
            type="password"
            minLength={8}
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Confirm new password
          <input
            className={INPUT}
            type="password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            autoComplete="new-password"
            required
          />
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
  );
}

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <ProfileSection user={user} updateUser={updateUser} showToast={showToast} />
      <BillingSection user={user} showToast={showToast} />
      <SecuritySection user={user} showToast={showToast} />
    </section>
  );
}
