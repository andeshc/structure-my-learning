import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  Layers,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteGuide, developGuide, extendGuide, finalizeGuide, getGuide, getGuideOutlineStatus } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function guideTags(guide) {
  if (guide.outline && Array.isArray(guide.outline.tags) && guide.outline.tags.length > 0) {
    return guide.outline.tags.slice(0, 2);
  }
  const words = guide.title.split(/\s+/).filter((word) => word.length > 3);
  return [words[0] || 'Learning', words[1] || guide.ageLevel.replaceAll('_', ' ')].slice(0, 2);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

const ageLevelLabels = {
  ages_8_10: 'Ages 8–10',
  ages_11_13: 'Ages 11–13',
  ages_14_17: 'Ages 14–17',
  adult_beginner: 'Adult Beginner',
  adult_advanced: 'Adult Advanced',
};

function formatAgeLevel(ageLevel) {
  return ageLevelLabels[ageLevel] ?? ageLevel.replaceAll('_', ' ');
}

function estimatedMinutes(subtopicCount) {
  return Math.max(subtopicCount, 1) * 15;
}

function statusLabel(topic, isNext) {
  if (topic?.isCompleted) return 'Done';
  if (isNext) return 'Next up';
  return null;
}

function statusClass(topic, isNext) {
  if (topic?.isCompleted) return 'bg-emerald-50 text-emerald-700';
  if (isNext) return 'bg-teal-50 text-teal-700';
  return '';
}

// ─── Outline polling view (status === 'pending') ──────────────────────────────

function SectionSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-slate-200 animate-pulse" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 w-3/5 rounded-full bg-slate-200 animate-pulse" />
        <div className="h-2.5 w-4/5 rounded-full bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

function OutlinePollingView({ guide, onReady, onFailed }) {
  const navigate = useNavigate();
  const [sections, setSections] = useState(guide.outline?.sections ?? []);
  const [title, setTitle] = useState(guide.outline?.title ?? '');
  const prevCountRef = useRef(sections.length);
  const bottomRef = useRef(null);
  const userScrolledRef = useRef(false);
  const guideId = guide.id;
  const prompt = guide.prompt;

  // Auto-scroll detection
  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 120;
      userScrolledRef.current = !nearBottom;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const visibleCount = sections.filter((s) => s.title?.trim()).length;

  // Scroll to bottom when new section arrives
  useEffect(() => {
    if (!userScrolledRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleCount]);

  // Polling loop
  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const data = await getGuideOutlineStatus(guideId);
        if (stopped) return;

        const incoming = data.outline?.sections ?? [];
        if (incoming.length > prevCountRef.current) {
          prevCountRef.current = incoming.length;
          setSections(incoming);
          if (data.outline?.title) setTitle(data.outline.title);
        }

        if (data.status === 'ready') {
          stopped = true;
          const full = await getGuide(guideId);
          onReady(full.guide);
          return;
        }
        if (data.status === 'failed') {
          stopped = true;
          const full = await getGuide(guideId);
          onFailed(full.guide);
          return;
        }
      } catch { /* ignore transient poll errors */ }
    }

    const timer = setInterval(poll, 500);
    poll(); // immediate first tick
    return () => { stopped = true; clearInterval(timer); };
  }, [guideId, onReady, onFailed]);

  const visibleSections = sections.filter((s) => s.title?.trim());
  const progressPct = visibleSections.length === 0
    ? 8
    : Math.min(90, Math.round((visibleSections.length / 5) * 85) + 8);

  return (
    <div className="mx-auto w-full max-w-2xl pt-8">
      <style>{`@keyframes sectionIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>

      <button
        onClick={() => navigate('/guides/new')}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700"
      >
        <ChevronLeft size={15} />
        Change prompt
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Building your guide</p>
      <p className="mt-2 text-xl font-semibold leading-snug text-slate-800 line-clamp-2">"{prompt}"</p>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${progressPct}%`, transition: 'width 0.6s ease' }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {visibleSections.length === 0
          ? 'Generating outline…'
          : `${visibleSections.length} section${visibleSections.length === 1 ? '' : 's'} ready`}
      </p>

      {title && <h2 className="mt-8 text-2xl font-bold text-slate-950">{title}</h2>}

      <div className="mt-4 flex flex-col gap-2">
        {visibleSections.map((section, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            style={{ animation: 'sectionIn 0.35s ease forwards' }}
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{section.title}</p>
              {section.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">{section.description}</p>
              )}
            </div>
          </div>
        ))}
        {Array.from({ length: Math.max(1, 5 - visibleSections.length) }).map((_, i) => (
          <SectionSkeleton key={`sk-${i}`} />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}

// ─── Review view (status === 'ready' && needsReview) ─────────────────────────

function ReviewView({ guide, onFinalize, isFinalizing }) {
  const [extraSections, setExtraSections] = useState([]);
  const [addMoreText, setAddMoreText] = useState('');
  const [isExtending, setIsExtending] = useState(false);
  const [extendError, setExtendError] = useState('');

  const originalSections = guide.outline?.sections ?? [];

  async function handleExtend(e) {
    e.preventDefault();
    if (!addMoreText.trim()) return;
    setIsExtending(true);
    setExtendError('');
    try {
      const { sections } = await extendGuide(guide.id, addMoreText.trim());
      setExtraSections((prev) => [...prev, ...sections]);
      setAddMoreText('');
    } catch (err) {
      setExtendError(err.message || 'Failed to generate sections.');
    } finally {
      setIsExtending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl pt-8">
      <div className="mb-6 flex items-center gap-3">
        <CheckCircle className="shrink-0 text-teal-700" size={22} />
        <div>
          <p className="font-semibold text-slate-900">Your guide is ready</p>
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-1">"{guide.prompt}"</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {originalSections.map((section, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{section.title}</p>
              {section.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">{section.description}</p>
              )}
            </div>
          </div>
        ))}
        {extraSections.map((section, i) => (
          <div key={`extra-${i}`} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-200 text-xs font-bold text-teal-800">
              {originalSections.length + i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-800">{section.title}</p>
                <span className="rounded-full border border-teal-200 bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                  Added by you
                </span>
              </div>
              {section.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">{section.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Want to add anything else to this guide?</p>
        <form onSubmit={handleExtend} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-charcoal/15 px-3 py-2 text-sm outline-none focus:border-teal-700"
            placeholder="e.g. add a section on practical applications"
            value={addMoreText}
            onChange={(e) => setAddMoreText(e.target.value)}
            disabled={isExtending}
            maxLength={300}
          />
          <button
            type="submit"
            disabled={isExtending || !addMoreText.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
          >
            <PlusCircle size={15} />
            {isExtending ? 'Adding…' : 'Add'}
          </button>
        </form>
        {extendError && <p className="mt-2 text-xs text-red-600">{extendError}</p>}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onFinalize(extraSections)}
          disabled={isFinalizing}
          className="rounded-md bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isFinalizing ? 'Starting…' : 'Finalize guide →'}
        </button>
      </div>
    </div>
  );
}

// ─── Normal guide detail components ──────────────────────────────────────────

function FallbackIllustration({ title }) {
  return (
    <svg className="h-full w-full" viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${title} illustration`}>
      <rect width="420" height="240" className="fill-[#fbf4e8]" />
      <g className="fill-amber-200">
        <circle cx="28" cy="34" r="3" /><circle cx="44" cy="34" r="3" /><circle cx="60" cy="34" r="3" />
        <circle cx="28" cy="50" r="3" /><circle cx="44" cy="50" r="3" /><circle cx="60" cy="50" r="3" />
        <circle cx="356" cy="150" r="3" /><circle cx="372" cy="150" r="3" /><circle cx="388" cy="150" r="3" />
      </g>
      <g className="stroke-slate-700" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M100 108h58M262 108h58M210 58v36M210 150v38" />
        <path d="M158 108h26M236 108h26M158 150h26M236 150h26" />
      </g>
      <rect x="184" y="66" width="52" height="92" rx="12" className="fill-blue-100 stroke-slate-700" strokeWidth="3" />
      <rect x="196" y="80" width="28" height="16" rx="4" className="fill-blue-200 stroke-slate-700" strokeWidth="2" />
      <rect x="196" y="104" width="28" height="16" rx="4" className="fill-emerald-200 stroke-slate-700" strokeWidth="2" />
      <rect x="196" y="128" width="28" height="16" rx="4" className="fill-amber-200 stroke-slate-700" strokeWidth="2" />
      <rect x="72" y="130" width="42" height="42" rx="7" className="fill-blue-100 stroke-blue-300" strokeWidth="2" />
      <rect x="306" y="118" width="48" height="58" rx="7" className="fill-violet-100 stroke-slate-700" strokeWidth="2" />
      <path d="M318 138h24M318 154h20" className="stroke-violet-500" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SubtopicStatusButton({ item, topicId, subtopicIndex, onRetry }) {
  if (item.hasContent) {
    return (
      <Link
        to={`/topics/${topicId}/subtopics/${subtopicIndex}`}
        className="shrink-0 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
      >
        Open →
      </Link>
    );
  }
  if (item.devStatus === 'developing') {
    return <span className="shrink-0 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />;
  }
  if (item.devStatus === 'failed') {
    return (
      <button
        onClick={onRetry}
        className="shrink-0 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
      >
        Retry →
      </button>
    );
  }
  return <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400">Pending</span>;
}

function ItemGroup({ items, topicId, onRetry }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, i) => (
        <li key={i} className="py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-slate-700">{item.title}</span>
              {item.overview && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.overview}</p>
              )}
            </div>
            {topicId && <SubtopicStatusButton item={item} topicId={topicId} subtopicIndex={i} onRetry={onRetry} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function TopicRow({ section, sectionIndex, topic, isNext, onRetry }) {
  const hasSubtopics = section.items && section.items.length > 0;
  const label = statusLabel(topic, isNext);

  return (
    <div
      id={`section-${sectionIndex + 1}`}
      className={`scroll-mt-8 -mx-5 sm:mx-0 border-y sm:rounded-xl sm:border transition-all ${
        isNext ? 'border-teal-200 bg-teal-50/40 shadow-sm' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
          topic?.isCompleted
            ? 'bg-emerald-100 text-emerald-700'
            : isNext
            ? 'bg-teal-100 text-teal-700'
            : 'bg-slate-200 text-slate-700'
        }`}>
          {sectionIndex + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-950">{section.title}</span>
            {label && (
              <span className={`inline-flex h-5 shrink-0 translate-y-px items-center rounded px-1.5 text-[10px] font-semibold ${statusClass(topic, isNext)}`}>
                {label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>
        </div>
      </div>

      {hasSubtopics && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-0">
          <ItemGroup items={section.items} topicId={topic?.id} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuideDetailPage() {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchGuide() {
      try {
        const data = await getGuide(guideId);
        if (!cancelled) setGuide(data.guide);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      }
    }
    fetchGuide();
    return () => { cancelled = true; };
  }, [guideId]);

  // Prefetch illustration URLs once guide is loaded
  useEffect(() => {
    if (!guide) return;
    const urls = guide.outline?.sections
      ?.flatMap((s) => s.items ?? [])
      ?.flatMap((item) => item.illustrationUrls ?? [])
      ?.filter(Boolean) ?? [];
    urls.forEach((url) => { const img = new Image(); img.src = url; });
  }, [guide?.id]);

  // Poll for development progress (6s) once development is underway
  useEffect(() => {
    if (!guide?.isBeingDeveloped) return;
    const timer = setInterval(async () => {
      try {
        const data = await getGuide(guideId);
        setGuide(data.guide);
      } catch { /* ignore */ }
    }, 6000);
    return () => clearInterval(timer);
  }, [guide?.isBeingDeveloped, guideId]);

  const summary = useMemo(() => {
    if (!guide || guide.status !== 'ready' || guide.needsReview) return null;
    const completed = guide.topics.filter((topic) => topic.isCompleted).length;
    const nextTopic = guide.topics.find((topic) => !topic.isCompleted) || guide.topics[0];
    const nextIndex = nextTopic ? guide.topics.findIndex((topic) => topic.id === nextTopic.id) : -1;
    const subtopicCount = guide.outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || guide.topicCount || guide.topics.length;
    const completedSubtopics = guide.completedSubtopicCount || 0;
    const subtopicPct = subtopicCount > 0 ? Math.round((completedSubtopics / subtopicCount) * 100) : 0;
    return {
      completed,
      duration: formatDuration(estimatedMinutes(subtopicCount)),
      nextIndex,
      nextTopic,
      subtopicCount,
      subtopicPct,
      tags: guideTags(guide),
      total: guide.topicCount || guide.topics.length,
    };
  }, [guide]);

  async function handleDevelop() {
    try {
      const data = await developGuide(guideId);
      setGuide(data.guide);
    } catch { /* ignore */ }
  }

  async function handleFinalize(extraSections) {
    setIsFinalizing(true);
    try {
      await finalizeGuide(guideId, extraSections);
      const data = await getGuide(guideId);
      setGuide(data.guide);
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteGuide(guideId);
      navigate('/');
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!guide) {
    return <LoadingPanel title="Loading guide" detail="Fetching the stored outline." />;
  }

  if (guide.status === 'failed') {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        Guide generation failed.{' '}
        <Link className="font-semibold underline" to="/guides/new">Try again</Link>
      </div>
    );
  }

  // Outline is still generating — show polling/streaming view
  if (guide.status === 'pending') {
    return (
      <OutlinePollingView
        guide={guide}
        onReady={(readyGuide) => setGuide(readyGuide)}
        onFailed={(failedGuide) => setGuide(failedGuide)}
      />
    );
  }

  // Outline is complete but user hasn't finalised yet — show review phase
  if (guide.needsReview) {
    return (
      <ReviewView
        guide={guide}
        onFinalize={handleFinalize}
        isFinalizing={isFinalizing}
      />
    );
  }

  if (!summary) {
    return <LoadingPanel title="Loading guide" detail="Fetching the stored outline." />;
  }

  return (
    <section>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700" to="/">
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>

        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Delete this guide?</span>
            <button
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            aria-label="Delete guide"
            className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:border-red-200 hover:text-red-600"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="p-5 lg:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                {formatAgeLevel(guide.ageLevel)}
              </span>
              {summary.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-slate-950">{guide.title}</h1>

            <div className="mt-4 max-w-sm">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">{summary.subtopicPct}% complete</span>
                <span className="text-xs text-slate-400">{summary.completed} of {summary.total} topics done</span>
              </div>
              <progress className="h-2 w-full overflow-hidden rounded-full" max="100" value={summary.subtopicPct}>
                {summary.subtopicPct}%
              </progress>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {summary.nextTopic && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  onClick={() => document.getElementById(`section-${summary.nextIndex + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <Layers size={17} />
                  {summary.subtopicPct === 100 ? 'Review guide' : summary.completed === 0 ? 'Start learning' : 'Continue'}
                </button>
              )}
              {guide.outline?.sections?.some((s) => s.items?.some((item) => item.devStatus === 'pending' || item.devStatus === 'failed')) && (
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
                  onClick={handleDevelop}
                >
                  {guide.isBeingDeveloped ? 'Developing…' : 'Resume development'}
                </button>
              )}
            </div>
          </div>

          <div className="aspect-[3/2] border-t border-slate-200 bg-[#fbf4e8] lg:aspect-auto lg:min-h-[220px] lg:border-l lg:border-t-0">
            {guide.illustrationUrl ? (
              <img className="h-full w-full object-cover" src={guide.illustrationUrl} alt={`${guide.title} illustration`} />
            ) : (
              <FallbackIllustration title={guide.title} />
            )}
          </div>
        </div>
      </div>

      {/* Topic list */}
      <div className="mt-6 grid gap-3">
        {guide.outline.sections.map((section, sectionIndex) => (
          <TopicRow
            key={`${section.title}-${sectionIndex}`}
            section={section}
            sectionIndex={sectionIndex}
            topic={guide.topics[sectionIndex]}
            isNext={sectionIndex === summary.nextIndex}
            onRetry={handleDevelop}
          />
        ))}
      </div>

      <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.063a.75.75 0 0 1-1.062-1.061l1.061-1.062a.75.75 0 0 1 1.06 0ZM3 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3ZM15.5 9.25a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5h-1.5ZM6.172 13.768a.75.75 0 0 0-1.06 1.06l1.06 1.062a.75.75 0 0 0 1.062-1.061l-1.062-1.061ZM14.89 14.828a.75.75 0 0 0-1.061-1.06l-1.062 1.06a.75.75 0 1 0 1.061 1.062l1.062-1.062ZM10 15.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15.5ZM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        </svg>
        AI-generated content — verify important information independently.
      </p>
    </section>
  );
}
