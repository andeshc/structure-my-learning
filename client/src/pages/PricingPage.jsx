import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Footer from '../components/Footer';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { getLtdStatus } from '../api/payments';
import { useUpgrade } from '../hooks/useUpgrade';

const PRICES = {
  INR: { annual: '₹299', monthly: '₹399', ltd: '₹5,999', annualTotal: '₹3,588', monthlyTotal: '₹4,788' },
  USD: { annual: '$9',   monthly: '$12',  ltd: '$149',   annualTotal: '$108',    monthlyTotal: '$144'   },
};

const FREE_FEATURES = [
  '3 lifetime guides',
  'Permanent access to your library',
  'AI tutor · 10 messages per guide',
];

const PRO_FEATURES = [
  'Unlimited guides',
  'Permanent access to your library',
  'AI tutor · generous fair use',
];

const LTD_FEATURES = [
  'Unlimited guides, forever',
  'Permanent access to your library',
  'AI tutor · generous fair use',
  'All future updates included',
];

function FeatureList({ features }) {
  return (
    <ul className="mt-5 space-y-3">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm text-charcoal-400">
          <Check size={15} className="mt-0.5 shrink-0 text-teal-700" />
          {f}
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { startCheckout, state } = useUpgrade();

  const FORCED_CURRENCY = import.meta.env.VITE_CURRENCY;
  const [currency, setCurrency] = useState(FORCED_CURRENCY || 'USD');
  const [billingCycle, setBillingCycle] = useState('annual');
  const [ltdStatus, setLtdStatus] = useState(null);

  useEffect(() => {
    if (!FORCED_CURRENCY) {
      fetch('/api/geo')
        .then((r) => r.json())
        .then((data) => setCurrency(data.country === 'IN' ? 'INR' : 'USD'))
        .catch(() => {});
    }

    getLtdStatus()
      .then(setLtdStatus)
      .catch(() => {});
  }, []);

  const region = currency === 'INR' ? 'in' : 'usd';
  const prices = PRICES[currency];
  const proKey = billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';
  const busy = state === 'creating' || state === 'overlay' || state === 'activating';

  function handleUpgrade(plan) {
    if (!isAuthenticated) {
      navigate(`/register?next=/pricing`);
      return;
    }
    startCheckout({ plan, region });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      {/* Fine-line grid fading downward */}
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: ['linear-gradient(rgba(15,118,110,0.10) 1px, transparent 1px)', 'linear-gradient(90deg, rgba(15,118,110,0.10) 1px, transparent 1px)'].join(', '), backgroundSize: '40px 40px', maskImage: 'linear-gradient(to bottom, black 30%, transparent 75%)', WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 75%)' }} />
      {/* Colour blooms */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: ['radial-gradient(ellipse 60% 80% at 15% 0%, rgba(99,102,241,0.08) 0%, transparent 60%)', 'radial-gradient(ellipse 70% 90% at 50% 0%, rgba(15,118,110,0.09) 0%, transparent 65%)', 'radial-gradient(ellipse 50% 70% at 85% 0%, rgba(251,146,60,0.07) 0%, transparent 55%)'].join(', ') }} />
      {/* Decorative pill stack */}
      <div className="pointer-events-none absolute -right-10 -top-6 opacity-[0.07]">
        <svg viewBox="0 0 104 73" className="w-80" aria-hidden="true">
          <rect x="54" y="0"  width="50" height="21" rx="10.5" fill="#0F766E"/>
          <rect x="27" y="26" width="50" height="21" rx="10.5" fill="#0F766E"/>
          <rect x="0"  y="52" width="50" height="21" rx="10.5" fill="#0F766E"/>
        </svg>
      </div>

      <div className="relative mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/"><Logo className="h-9 w-auto" /></Link>
          <Link className="text-sm text-charcoal-400 hover:text-charcoal" to="/">← Back</Link>
        </div>

        {/* Hero */}
        <div className="mt-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-charcoal">Simple, transparent pricing</h1>
          <p className="mt-3 text-charcoal-400">Start free. Upgrade when you're ready.</p>
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          {/* Billing toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-charcoal/10 bg-white p-1">
            <button
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${billingCycle === 'annual' ? 'bg-charcoal text-white' : 'text-charcoal-400 hover:text-charcoal'}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual
              {billingCycle === 'annual' && (
                <span className="rounded-full bg-teal-700/15 px-1.5 py-0.5 text-xs font-semibold text-teal-700">Save 25%</span>
              )}
            </button>
            <button
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-charcoal text-white' : 'text-charcoal-400 hover:text-charcoal'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
          </div>

        </div>

        {/* Cards */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-xl border border-charcoal/10 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">Free</p>
            <p className="mt-3 text-4xl font-semibold text-charcoal">Free</p>
            <p className="mt-1 text-sm text-charcoal-400">No credit card required</p>
            <div className="my-5 border-t border-charcoal/8" />
            <div className="flex-1"><FeatureList features={FREE_FEATURES} /></div>
            <Link
              to="/register"
              className="mt-8 block w-full rounded-md border border-charcoal/20 px-4 py-2.5 text-center text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-xl border border-charcoal/10 bg-white p-6 ring-2 ring-teal-700 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Pro</p>
            <div className="mt-3 flex items-end gap-1">
              <p className="text-4xl font-semibold text-charcoal">{prices[billingCycle]}</p>
              <p className="mb-1 text-sm text-charcoal-400">/month</p>
            </div>
            <p className="mt-1 text-sm text-charcoal-400">
              {billingCycle === 'annual' ? (
                <>Billed <s>{prices.monthlyTotal}</s> {prices.annualTotal} annually</>
              ) : 'Billed monthly'}
            </p>
            <div className="my-5 border-t border-charcoal/8" />
            <div className="flex-1"><FeatureList features={PRO_FEATURES} /></div>
            <button
              disabled={busy}
              onClick={() => handleUpgrade(proKey)}
              className="mt-8 block w-full rounded-md bg-teal-700 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? 'Processing…' : 'Start with Pro'}
            </button>
          </div>

          {/* Lifetime */}
          <div className="flex flex-col rounded-xl border border-charcoal/10 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">Lifetime</p>
            <p className="mt-3 text-4xl font-semibold text-charcoal">{prices.ltd}</p>
            <p className="mt-1 text-sm text-charcoal-400">
              {ltdStatus ? `${ltdStatus.seats_remaining} seats left` : 'One-time payment'}
            </p>
            <div className="my-5 border-t border-charcoal/8" />
            <div className="flex-1"><FeatureList features={LTD_FEATURES} /></div>
            <button
              disabled={busy || ltdStatus?.sold_out}
              onClick={() => handleUpgrade('ltd')}
              className="mt-8 block w-full rounded-md border border-charcoal/20 px-4 py-2.5 text-center text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ltdStatus?.sold_out ? 'Sold out' : busy ? 'Processing…' : 'Get Lifetime Access'}
            </button>
          </div>
        </div>

        {/* State feedback */}
        {state === 'activating' && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-charcoal-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-700/30 border-t-teal-700" />
            Activating your plan…
          </div>
        )}
        {state === 'success' && (
          <p className="mt-6 text-center text-sm font-medium text-teal-700">
            <Check size={14} className="inline mr-1" />
            Plan activated! Welcome to Pro.
          </p>
        )}
        {state === 'timeout' && (
          <p className="mt-6 text-center text-sm text-charcoal-400">
            Payment received — your plan is taking a moment to activate. Refresh in a minute.
          </p>
        )}
        {state === 'error' && (
          <p className="mt-6 text-center text-sm text-red-600">
            Something went wrong. Please try again or contact support.
          </p>
        )}
      </div>

      <Footer className="border-t border-charcoal/10" />
    </div>
  );
}
