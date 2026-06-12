import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLtdStatus } from '../api/payments';
import { useUpgrade } from '../hooks/useUpgrade';

const PRICES = {
  INR: { annual: '₹299', monthly: '₹399', ltd: '₹5,999' },
  USD: { annual: '$9',   monthly: '$12',  ltd: '$149'   },
};

const PRO_FEATURES = [
  'Unlimited guides',
  'AI tutor — generous use',
  'All learning levels & depths',
];

const LTD_FEATURES = [
  'Everything in Pro, forever',
  'One-time payment, no renewals',
  'All future updates included',
];

export default function UpgradeModal({ isOpen, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const { startCheckout, state, reset } = useUpgrade();
  const [billingCycle, setBillingCycle] = useState('annual');
  const [ltdSoldOut, setLtdSoldOut] = useState(false);

  const FORCED_CURRENCY = import.meta.env.VITE_CURRENCY?.toUpperCase();
  const [currency, setCurrency] = useState(FORCED_CURRENCY || 'USD');
  const prices = PRICES[currency] ?? PRICES.USD;

  useEffect(() => {
    if (!isOpen) return;
    reset();
    getLtdStatus()
      .then((d) => setLtdSoldOut(d.sold_out))
      .catch(() => {});
    if (FORCED_CURRENCY) {
      setCurrency(FORCED_CURRENCY);
    } else {
      fetch('/api/geo')
        .then((r) => r.json())
        .then((d) => setCurrency(d.country === 'IN' ? 'INR' : 'USD'))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const region = currency === 'INR' ? 'in' : 'usd';
  const proKey = billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';
  const busy = state === 'creating' || state === 'overlay' || state === 'activating';

  const atLimit = user?.plan === 'free';

  function handleUpgrade(plan) {
    if (!isAuthenticated) {
      window.location.href = '/register?next=/pricing';
      return;
    }
    startCheckout({ plan, region });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          className="absolute right-4 top-4 rounded-md p-1 text-charcoal-400 hover:text-charcoal"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-semibold text-charcoal">Upgrade your plan</h2>
        <p className="mt-1 text-sm text-charcoal-400">
          {atLimit
            ? "You've reached the free-tier guide limit."
            : 'Unlock unlimited guides and more.'}
        </p>

        {/* Billing cycle toggle */}
        <div className="mt-4 flex items-center gap-1 rounded-lg border border-charcoal/10 bg-slate-50 p-0.5 w-fit">
          {['annual', 'monthly'].map((c) => (
            <button
              key={c}
              onClick={() => setBillingCycle(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize ${billingCycle === c ? 'bg-charcoal text-white' : 'text-charcoal-400 hover:text-charcoal'}`}
            >
              {c}
              {c === 'annual' && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs transition-colors ${billingCycle === 'annual' ? 'bg-white/20 text-white' : 'bg-teal-700/15 text-teal-700'}`}>
                  -25%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {/* Pro card */}
          <div className="rounded-xl border-2 border-teal-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Pro</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-charcoal">{prices[billingCycle]}</span>
              <span className="text-sm text-charcoal-400">/month</span>
            </div>
            <p className="text-xs text-charcoal-400 mt-0.5">
              {billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
            </p>
            <ul className="mt-3 space-y-1.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-charcoal-400">
                  <Check size={13} className="text-teal-700 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button
              disabled={busy}
              onClick={() => handleUpgrade(proKey)}
              className="mt-4 w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? 'Processing…' : 'Upgrade to Pro'}
            </button>
          </div>

          {/* Lifetime card */}
          <div className="rounded-xl border border-charcoal/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">Lifetime</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-charcoal">{prices.ltd}</span>
            </div>
            <p className="text-xs text-charcoal-400 mt-0.5">One-time payment, forever</p>
            <ul className="mt-3 space-y-1.5">
              {LTD_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-charcoal-400">
                  <Check size={13} className="text-charcoal-200 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <button
              disabled={busy || ltdSoldOut}
              onClick={() => handleUpgrade('ltd')}
              className="mt-4 w-full rounded-md border border-charcoal/20 px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ltdSoldOut ? 'Sold out' : busy ? 'Processing…' : 'Get Lifetime Access'}
            </button>
          </div>
        </div>

        {/* State feedback */}
        {state === 'activating' && (
          <p className="mt-4 text-center text-sm text-charcoal-400">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-700/30 border-t-teal-700 mr-2 align-middle" />
            Activating your plan…
          </p>
        )}
        {state === 'success' && (
          <p className="mt-4 text-center text-sm font-medium text-teal-700">
            <Check size={14} className="inline mr-1" />
            Plan activated! Enjoy your upgrade.
          </p>
        )}
        {state === 'timeout' && (
          <p className="mt-4 text-center text-sm text-charcoal-400">
            Payment received — your plan is taking a moment to activate. Refresh in a minute.
          </p>
        )}
        {state === 'error' && (
          <p className="mt-4 text-center text-sm text-red-600">
            Something went wrong. Please try again or contact support.
          </p>
        )}
      </div>
    </div>
  );
}
