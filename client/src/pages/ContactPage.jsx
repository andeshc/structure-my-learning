import { useState } from 'react';
import { Link } from 'react-router';
import { apiRequest } from '../api/client';
import Footer from '../components/Footer';

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
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">StructureMyLearning</p>
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
