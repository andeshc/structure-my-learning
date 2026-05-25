import { useState } from 'react';
import { Link } from 'react-router';
import { apiRequest } from '../api/client';
import Footer from '../components/Footer';
import Logo from '../components/Logo';

const INPUT = 'mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 text-sm outline-none focus:border-teal-700';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function updateField(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/api/contact', { method: 'POST', body: JSON.stringify(form) });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: ['linear-gradient(rgba(15,118,110,0.10) 1px, transparent 1px)', 'linear-gradient(90deg, rgba(15,118,110,0.10) 1px, transparent 1px)'].join(', '), backgroundSize: '40px 40px', maskImage: 'linear-gradient(to bottom, black 30%, transparent 75%)', WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 75%)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: ['radial-gradient(ellipse 60% 80% at 15% 0%, rgba(99,102,241,0.08) 0%, transparent 60%)', 'radial-gradient(ellipse 70% 90% at 50% 0%, rgba(15,118,110,0.09) 0%, transparent 65%)', 'radial-gradient(ellipse 50% 70% at 85% 0%, rgba(251,146,60,0.07) 0%, transparent 55%)'].join(', ') }} />
      {/* Decorative pill stack — brand motif, top-right */}
      <div className="pointer-events-none absolute -right-10 -top-6 opacity-[0.07]">
        <svg viewBox="0 0 104 73" className="w-80" aria-hidden="true">
          <rect x="54" y="0"  width="50" height="21" rx="10.5" fill="#0F766E"/>
          <rect x="27" y="26" width="50" height="21" rx="10.5" fill="#0F766E"/>
          <rect x="0"  y="52" width="50" height="21" rx="10.5" fill="#0F766E"/>
        </svg>
      </div>
      <div className="relative mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo className="h-9 w-auto" /></Link>
          <Link className="text-sm text-charcoal-400 hover:text-charcoal" to="/">← Back</Link>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-charcoal">Contact</h1>
        <p className="mt-2 text-sm text-charcoal-400">Have a question or feedback? We'd love to hear from you.</p>

        {sent ? (
          <div className="mt-8 rounded-lg border border-charcoal/10 bg-white p-6 text-center">
            <p className="font-medium text-charcoal">Message sent!</p>
            <p className="mt-1 text-sm text-charcoal-400">Thanks — we'll get back to you soon.</p>
          </div>
        ) : (
          <form className="mt-8 space-y-4 rounded-lg border border-charcoal/10 bg-white p-6" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-charcoal">
              Name
              <input className={INPUT} name="name" value={form.name} onChange={updateField} required />
            </label>
            <label className="block text-sm font-medium text-charcoal">
              Email
              <input className={INPUT} type="email" name="email" value={form.email} onChange={updateField} required />
            </label>
            <label className="block text-sm font-medium text-charcoal">
              Message
              <textarea
                className={`${INPUT} resize-none`}
                name="message"
                rows={5}
                minLength={10}
                value={form.message}
                onChange={updateField}
                required
              />
            </label>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              className="w-full rounded-md bg-charcoal px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>

      <Footer className="border-t border-charcoal/10" />
    </div>
  );
}
