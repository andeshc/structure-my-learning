import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getSharedGuideMeta, getSharedGuide, adoptGuide } from '../api/share';
import { resendVerification } from '../api/auth';
import { OAUTH_PROVIDERS } from '../components/oauthProviders';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

// ─── Inline auth panel ────────────────────────────────────────────────────────

function AuthPanel({ shareToken }) {
  const auth = useAuth();
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', password: '', referralSource: '', referralSourceOther: '' });
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';

  function updateField(e) {
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isRegister) {
        const result = await auth.signUp(form);
        if (result?.pendingVerification) { setPendingVerification(true); return; }
      } else {
        await auth.signIn({ email: form.email, password: form.password });
      }
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(form.email);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setResendSent(false);
    await resendVerification(unverifiedEmail || form.email).catch(() => null);
    setResendSent(true);
  }

  const oauthState = shareToken ? `?next=/share/${shareToken}` : '';

  if (pendingVerification) {
    return (
      <div className="text-center py-4">
        <p className="text-xl font-semibold text-charcoal">Check your email</p>
        <p className="mt-2 text-sm text-charcoal-400">
          We sent a verification link to <strong>{form.email}</strong>.
        </p>
        <p className="mt-4 text-sm text-charcoal-400">
          Didn't receive it?{' '}
          {resendSent
            ? <span className="text-teal-700">Sent! Check your inbox.</span>
            : <button className="font-medium text-teal-700 hover:underline" onClick={handleResend}>Resend</button>
          }
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal">
        {isRegister ? 'Create a free account to continue' : 'Welcome back'}
      </h2>
      <p className="mt-1 text-sm text-charcoal-400">
        {isRegister ? 'Three free guides. No credit card required.' : 'Log in to view this guide.'}
      </p>

      <div className="mt-5 grid gap-2">
        {OAUTH_PROVIDERS.map(({ key, path, label, Icon }) => (
          <a
            key={key}
            className="flex items-center justify-center gap-2.5 rounded-md border border-charcoal/15 px-4 py-2 text-sm font-medium transition-colors hover:bg-charcoal/5"
            href={`${path}${oauthState}`}
          >
            <Icon /> Continue with {label}
          </a>
        ))}
      </div>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-charcoal/10" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs font-medium text-charcoal-200">OR</span></div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegister && (
          <label className="block text-sm font-medium">
            Name
            <input className="mt-1.5 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="name" value={form.name} onChange={updateField} required />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input className="mt-1.5 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="email" type="email" value={form.email} onChange={updateField} required />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input className="mt-1.5 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700" name="password" type="password" minLength="8" value={form.password} onChange={updateField} required />
        </label>
        {isRegister && (
          <label className="block text-sm font-medium">
            Where did you hear about us?
            <select className="mt-1.5 w-full rounded-md border border-charcoal/15 px-3 py-2 bg-white outline-none focus:border-teal-700" name="referralSource" value={form.referralSource} onChange={updateField} required>
              <option value="" disabled>Select one…</option>
              <option value="friend">Friend or colleague</option>
              <option value="twitter_x">Twitter / X</option>
              <option value="linkedin">LinkedIn</option>
              <option value="reddit">Reddit</option>
              <option value="google">Google Search</option>
              <option value="product_hunt">Product Hunt</option>
              <option value="other">Other</option>
            </select>
          </label>
        )}
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            {unverifiedEmail && (
              <p className="mt-1">
                {resendSent
                  ? 'Email sent — check your inbox.'
                  : <button className="font-medium underline" type="button" onClick={handleResend}>Resend verification</button>
                }
              </p>
            )}
          </div>
        )}
        <button className="w-full rounded-md bg-charcoal px-4 py-2.5 font-medium text-white disabled:opacity-60" disabled={isSubmitting}>
          {isSubmitting ? 'Working…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-charcoal-400">
        {isRegister ? 'Already have an account?' : 'New here?'}{' '}
        <button className="font-medium text-teal-700 hover:underline" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
          {isRegister ? 'Log in' : 'Create one'}
        </button>
      </p>
    </div>
  );
}

// ─── Subtopic item in shared guide ───────────────────────────────────────────

function SharedSubtopicItem({ item, topicId, position, shareToken }) {
  return (
    <li className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-slate-700">{item.title}</span>
        </div>
        <div className="shrink-0">
          {item.hasContent && topicId ? (
            <Link
              to={`/share/${shareToken}/topics/${topicId}/subtopics/${position}`}
              className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              Open →
            </Link>
          ) : (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400">Pending</span>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Adoption modal ───────────────────────────────────────────────────────────

function AdoptionModal({ guide, onAdd, onPreview, isAdding }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {guide.illustrationUrl && (
          <div className="h-36 overflow-hidden">
            <img src={guide.illustrationUrl} alt={guide.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-6">
          {guide.ownerName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Shared by {guide.ownerName}
            </p>
          )}
          <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900">{guide.title}</h2>
          <p className="mt-0.5 text-sm text-slate-400">{guide.topicCount} topic{guide.topicCount !== 1 ? 's' : ''}</p>

          <div className="mt-5 rounded-xl bg-teal-50 px-4 py-3">
            <p className="text-sm font-semibold text-teal-900">Add to your library to:</p>
            <ul className="mt-2 space-y-1.5 text-sm text-teal-800">
              <li>✓ Track your progress across all lessons</li>
              <li>✓ Ask the AI tutor questions as you learn</li>
              <li>✓ Access every lesson anytime, at your own pace</li>
            </ul>
          </div>

          <button
            onClick={onAdd}
            disabled={isAdding}
            className="mt-4 w-full rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
          >
            {isAdding ? 'Adding…' : 'Add to Library'}
          </button>
          <button
            onClick={onPreview}
            className="mt-3 w-full text-center text-sm text-slate-400 transition-colors hover:text-slate-600"
          >
            Just preview <span className="text-slate-300 mx-1">·</span> limited to 2 lessons
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sticky bar (shown while previewing) ─────────────────────────────────────

function StickyAdoptBar({ guide, onAdd, isAdding }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between gap-4 border-t border-teal-200 bg-white/90 px-5 py-3 backdrop-blur-sm">
      <p className="min-w-0 text-sm text-slate-700">
        <span className="font-semibold">Add to your library</span>
        <span className="hidden sm:inline text-slate-500"> to track progress and use the AI tutor</span>
      </p>
      <button
        onClick={onAdd}
        disabled={isAdding}
        className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-60"
      >
        {isAdding ? 'Adding…' : 'Add to Library'}
      </button>
    </div>
  );
}

// ─── Read-only guide view (renders inside AppShell's <main>) ─────────────────

function SharedGuideView({ shareToken, guide, ownerName, isPreviewing, onAdd, isAdding }) {
  return (
    <section className={isPreviewing ? 'pb-20' : ''}>
      {isPreviewing && <StickyAdoptBar guide={guide} onAdd={onAdd} isAdding={isAdding} />}

      {/* Hero — same layout as GuideDetailPage */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="p-5 lg:p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Shared by <span className="text-teal-700">{ownerName || guide.ownerName}</span>
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-slate-950">{guide.title}</h1>
            <p className="mt-3 text-sm text-slate-500">
              {guide.topicCount} topic{guide.topicCount !== 1 ? 's' : ''} · Read-only preview
            </p>
          </div>
          <div className="aspect-[3/2] border-t border-slate-200 bg-[#fbf4e8] lg:aspect-auto lg:min-h-[220px] lg:border-l lg:border-t-0">
            {guide.illustrationUrl
              ? <img className="h-full w-full object-cover" src={guide.illustrationUrl} alt={guide.title} />
              : <div className="h-full w-full" />
            }
          </div>
        </div>
      </div>

      {/* Topic list — same structure as GuideDetailPage */}
      <div className="mt-6 grid gap-3">
        {(guide.outline?.sections ?? []).map((section, si) => {
          const topic = guide.topics?.[si];
          return (
            <div
              key={si}
              className="-mx-5 sm:mx-0 border-y sm:rounded-xl sm:border border-slate-200 bg-white"
            >
              <div className="flex items-start gap-4 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                  {si + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-950">{section.title}</span>
                  <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
              {section.items?.length > 0 && (
                <div className="border-t border-slate-100 px-4 pb-3 pt-0">
                  <ul className="divide-y divide-slate-100">
                    {section.items.map((item, pos) => (
                      <SharedSubtopicItem
                        key={pos}
                        item={item}
                        topicId={topic?.id}
                        position={pos}
                        shareToken={shareToken}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
}

// ─── Unauthenticated preview ──────────────────────────────────────────────────

function UnauthenticatedView({ meta, shareToken }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-auto bg-canvas">
      {/* Background grid */}
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
      <div
        className="pointer-events-none absolute inset-x-0 -top-20 h-[500px]"
        style={{
          background: [
            'radial-gradient(ellipse 55% 70% at 10% 0%, rgba(99,102,241,0.11) 0%, transparent 60%)',
            'radial-gradient(ellipse 70% 90% at 40% 0%, rgba(15,118,110,0.10) 0%, transparent 65%)',
          ].join(', '),
        }}
      />

      <div className="relative mx-auto grid flex-1 max-w-6xl w-full items-center gap-8 px-4 py-10 md:grid-cols-[1fr_420px]">
        {/* Left — guide preview */}
        <section>
          <Link to="/"><Logo className="h-10 w-auto" /></Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-teal-700">You've been invited to learn</p>
          <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight text-charcoal md:text-4xl">
            {meta?.title ?? 'A structured learning guide'}
          </h1>
          {meta?.ownerName && (
            <p className="mt-2 text-sm text-charcoal-400">Shared by <span className="font-medium text-charcoal">{meta.ownerName}</span></p>
          )}
          {meta?.illustrationUrl && (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 shadow-md">
              <img src={meta.illustrationUrl} alt={meta.title} className="w-full object-cover" style={{ maxHeight: '220px' }} />
            </div>
          )}
          {meta?.topicCount && (
            <p className="mt-3 text-sm text-charcoal-400">{meta.topicCount} topic{meta.topicCount !== 1 ? 's' : ''} · AI-generated structured guide</p>
          )}
        </section>

        {/* Right — inline auth */}
        <section className="rounded-lg border border-charcoal/10 bg-white p-6">
          <AuthPanel shareToken={shareToken} />
        </section>
      </div>

      <Footer className="border-t border-charcoal/10 relative" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SharedGuidePage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();

  const [meta, setMeta] = useState(null);
  const [guide, setGuide] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch public meta for unauthenticated preview
  useEffect(() => {
    getSharedGuideMeta(shareToken).then(setMeta).catch(() => null);
  }, [shareToken]);

  // Fetch full guide once authenticated
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    setLoadingGuide(true);
    getSharedGuide(shareToken)
      .then((data) => {
        if (data.alreadyAdopted) {
          navigate(`/guides/${data.guideId}`, { replace: true });
          return;
        }
        if (data.guide?.userId === auth.user?.id) {
          navigate(`/guides/${data.guide.id}`, { replace: true });
          return;
        }
        setGuide(data.guide);
        setOwnerName(data.guide?.ownerName ?? '');
        setShowModal(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingGuide(false));
  }, [auth.isAuthenticated, shareToken]);

  async function handleAdd() {
    setIsAdding(true);
    try {
      const { guideId } = await adoptGuide(shareToken);
      navigate(`/guides/${guideId}`);
    } catch {
      setIsAdding(false);
    }
  }

  function handlePreview() {
    setShowModal(false);
    setIsPreviewing(true);
  }

  if (!auth.isAuthenticated) {
    return <UnauthenticatedView meta={meta} shareToken={shareToken} />;
  }

  if (auth.status === 'loading' || loadingGuide) {
    return <p className="text-sm text-charcoal-400">Loading…</p>;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/" className="text-sm font-medium text-teal-700 hover:underline">Go home</Link>
      </div>
    );
  }

  if (!guide) return null;

  return (
    <>
      {showModal && (
        <AdoptionModal
          guide={guide}
          onAdd={handleAdd}
          onPreview={handlePreview}
          isAdding={isAdding}
        />
      )}
      <SharedGuideView
        shareToken={shareToken}
        guide={guide}
        ownerName={ownerName}
        isPreviewing={isPreviewing}
        onAdd={handleAdd}
        isAdding={isAdding}
      />
    </>
  );
}
