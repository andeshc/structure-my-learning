import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Footer from '../components/Footer';

const PRICES = {
  INR: { annual: '₹299', monthly: '₹399' },
  USD: { annual: '$9',   monthly: '$12'  },
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
  const [currency, setCurrency] = useState('USD');
  const [billingCycle, setBillingCycle] = useState('annual');

  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((data) => setCurrency(data.country === 'IN' ? 'INR' : 'USD'))
      .catch(() => {});
  }, []);

  const price = PRICES[currency][billingCycle];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">StructureMyLearning</p>
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
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-charcoal/10 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-400">Free</p>
            <p className="mt-3 text-4xl font-semibold text-charcoal">Free</p>
            <p className="mt-1 text-sm text-charcoal-400">No credit card required</p>
            <div className="my-5 border-t border-charcoal/8" />
            <FeatureList features={FREE_FEATURES} />
            <Link
              to="/register"
              className="mt-8 block w-full rounded-md border border-charcoal/20 px-4 py-2.5 text-center text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/5"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-charcoal/10 bg-white p-6 ring-2 ring-teal-700 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Pro</p>
            <div className="mt-3 flex items-end gap-1">
              <p className="text-4xl font-semibold text-charcoal">{price}</p>
              <p className="mb-1 text-sm text-charcoal-400">/month</p>
            </div>
            <p className="mt-1 text-sm text-charcoal-400">
              {billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
            </p>
            <div className="my-5 border-t border-charcoal/8" />
            <FeatureList features={PRO_FEATURES} />
            <Link
              to="/register"
              className="mt-8 block w-full rounded-md bg-teal-700 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-teal-800"
            >
              Start with Pro
            </Link>
          </div>
        </div>
      </div>

      <Footer className="border-t border-charcoal/10" />
    </div>
  );
}
