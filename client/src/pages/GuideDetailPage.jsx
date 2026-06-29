import {
  ArrowLeft,
  CheckCircle,
  Layers,
  Link2,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteGuide, developGuide, finalizeGuide, getGuide, getGuideOutlineStatus, refineGuide, toggleSharing } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function guideTags(guide) {
  if (guide.outline && Array.isArray(guide.outline.tags) && guide.outline.tags.length > 0) {
    return guide.outline.tags.slice(0, 2);
  }
  const words = guide.title.split(/\s+/).filter((word) => word.length > 3);
  return [words[0] || 'Learning', words[1] || guide.learningLevel.replaceAll('_', ' ')].slice(0, 2);
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

const learningLevelLabels = {
  early_learner:      'Early Learner',
  young_child:        'Young Child',
  middle_schooler:    'Middle Schooler',
  high_schooler:      'High Schooler',
  adult_beginner:     'Adult Beginner',
  adult_intermediate: 'Adult Intermediate',
  adult_advanced:     'Adult Advanced',
};

function formatLearningLevel(level) {
  return learningLevelLabels[level] ?? level.replaceAll('_', ' ');
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

// ─── Refinement panel (shown when needsReview) ───────────────────────────────

function RefinementPanel({ onRefine, isRefining, onFinalize, isFinalizing, disabled }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await onRefine(text.trim());
      setText('');
    } catch (err) {
      setError(err.message || 'Failed to refine the outline.');
    }
  }

  return (
    <div className={`mt-4 rounded-xl border border-teal-200 bg-white p-4 shadow-sm transition-opacity ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <p className="text-sm font-semibold text-slate-800">Review your guide outline below</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Describe any changes you'd like — we'll update the outline for you. Or finalize it as-is.
      </p>
      <form onSubmit={handleSubmit} className="mt-3">
        <textarea
          className="min-h-[60px] w-full resize-none rounded-md border border-charcoal/15 px-3 py-2 text-sm outline-none focus:border-teal-700"
          placeholder="e.g. Add a section on practical applications between Fundamentals and Advanced Topics"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isRefining || isFinalizing}
          rows={2}
          maxLength={500}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {text.trim() ? (
            <button
              type="submit"
              disabled={isRefining || isFinalizing}
              className="rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
            >
              {isRefining ? 'Refining…' : 'Refine'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinalize}
              disabled={isFinalizing || isRefining}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {isFinalizing ? 'Finalizing…' : 'Finalize Guide →'}
            </button>
          )}
        </div>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Building panel (shown while outline streams) ────────────────────────────

function BuildingPanel({ visibleCount }) {
  const pct = visibleCount === 0 ? 8 : Math.min(90, Math.round((visibleCount / 5) * 85) + 8);
  return (
    <div className="mt-4 rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">Building your guide outline…</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {visibleCount === 0 ? 'Generating outline…' : `${visibleCount} section${visibleCount === 1 ? '' : 's'} ready`}
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ─── Inline header refinement ────────────────────────────────────────────────

function InlineHeaderRefinement({ onRefine, isRefining, onFinalize, isFinalizing }) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try { await onRefine(text.trim()); setText(''); setExpanded(false); }
    catch (err) { setError(err.message || 'Failed to refine.'); }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-sm font-semibold text-slate-700">Does this outline look right?</p>
      <p className="mt-0.5 text-xs text-slate-400">Finalize to start generating lessons, or suggest a change first.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={onFinalize} disabled={isFinalizing || isRefining || expanded} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {isFinalizing ? 'Finalizing…' : 'Finalize Guide →'}
        </button>
        <button type="button" onClick={() => setExpanded((v) => !v)} disabled={isRefining || isFinalizing} className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">
          {expanded ? 'Never mind' : 'Suggest a change'}
        </button>
      </div>
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-3">
          <textarea
            className="min-h-[60px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
            placeholder="e.g. Add a section on practical applications between Fundamentals and Advanced Topics"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isRefining || isFinalizing}
            rows={2}
            maxLength={500}
            autoFocus
          />
          <div className="mt-2">
            <button type="submit" disabled={!text.trim() || isRefining} className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50">
              {isRefining ? 'Refining…' : 'Refine outline'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}

// ─── Trailing action card ────────────────────────────────────────────────────

function TrailingRefinementCard({ onRefine, isRefining, onFinalize, isFinalizing }) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    try { await onRefine(text.trim()); setText(''); setExpanded(false); }
    catch (err) { setError(err.message || 'Failed to refine.'); }
  }

  return (
    <div className="mt-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5">
      <p className="text-sm font-semibold text-slate-700">Does this outline look right?</p>
      <p className="mt-0.5 text-xs text-slate-400">Finalize to start generating lessons, or suggest a change first.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={onFinalize} disabled={isFinalizing || isRefining || expanded} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
          {isFinalizing ? 'Finalizing…' : 'Finalize Guide →'}
        </button>
        <button type="button" onClick={() => setExpanded((v) => !v)} disabled={isRefining || isFinalizing} className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">
          {expanded ? 'Never mind' : 'Suggest a change'}
        </button>
      </div>
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-3">
          <textarea
            className="min-h-[60px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
            placeholder="e.g. Add a section on practical applications between Fundamentals and Advanced Topics"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isRefining || isFinalizing}
            rows={2}
            maxLength={500}
            autoFocus
          />
          <div className="mt-2">
            <button type="submit" disabled={!text.trim() || isRefining} className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50">
              {isRefining ? 'Refining…' : 'Refine outline'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </form>
      )}
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

function ItemGroup({ items, topicId, onRetry, isReviewMode }) {
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
            {!isReviewMode && topicId && <SubtopicStatusButton item={item} topicId={topicId} subtopicIndex={i} onRetry={onRetry} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function TopicRow({ section, sectionIndex, topic, isNext, isNew, onRetry, isReviewMode }) {
  const hasSubtopics = section.items && section.items.length > 0;
  const label = statusLabel(topic, isNext);

  return (
    <div
      id={`section-${sectionIndex + 1}`}
      className={`scroll-mt-8 -mx-5 sm:mx-0 border-y sm:rounded-xl sm:border transition-all ${
        isNew ? 'border-blue-300 bg-blue-50/40 shadow-sm'
        : isNext ? 'border-teal-200 bg-teal-50/40 shadow-sm'
        : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
          topic?.isCompleted
            ? 'bg-emerald-100 text-emerald-700'
            : isNext
            ? 'bg-teal-100 text-teal-700'
            : isNew
            ? 'bg-blue-100 text-blue-700'
            : 'bg-slate-200 text-slate-700'
        }`}>
          {sectionIndex + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-950">{section.title}</span>
            {isNew && (
              <span className="inline-flex h-5 shrink-0 translate-y-px items-center rounded bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">
                Added
              </span>
            )}
            {!isNew && label && (
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
          <ItemGroup items={section.items} topicId={topic?.id} onRetry={onRetry} isReviewMode={isReviewMode} />
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
  const [isRefining, setIsRefining] = useState(false);
  const [newSectionIndices, setNewSectionIndices] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [isTogglingShare, setIsTogglingShare] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [streamingSections, setStreamingSections] = useState([]);
  const [streamingTitle, setStreamingTitle] = useState('');
  const [streamingTags, setStreamingTags] = useState([]);
  const prevSectionCountRef = useRef(0);
  const bottomRef = useRef(null);
  const userScrolledRef = useRef(false);
  const scrollToBottomAfterTransitionRef = useRef(false);
  const scrollToSectionRef = useRef(null);
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

  // Sync share state whenever guide changes (initial load or poll refresh)
  useEffect(() => {
    if (!guide) return;
    setIsPublic(guide.isPublic ?? false);
    setShareUrl(guide.shareToken ? `${window.location.origin}/share/${guide.shareToken}` : null);
  }, [guide?.id, guide?.isPublic, guide?.shareToken]);

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

  // Scroll detection while streaming
  useEffect(() => {
    if (guide?.status !== 'pending') return;
    const onScroll = () => {
      const nearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 120;
      userScrolledRef.current = !nearBottom;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [guide?.status]);

  // Outline streaming poll
  useEffect(() => {
    if (!guide || guide.status !== 'pending') return;
    const initial = guide.outline?.sections ?? [];
    setStreamingSections(initial);
    prevSectionCountRef.current = initial.length;
    let stopped = false;

    async function poll() {
      try {
        const data = await getGuideOutlineStatus(guide.id);
        if (stopped) return;
        const incoming = data.outline?.sections ?? [];
        const newCount = incoming.length;
        if (newCount !== prevSectionCountRef.current) prevSectionCountRef.current = newCount;
        setStreamingSections(incoming);
        if (data.outline?.title) setStreamingTitle(data.outline.title);
        if (data.outline?.tags?.length) setStreamingTags(data.outline.tags);
        if (data.status === 'ready' || data.status === 'failed') {
          stopped = true;
          const full = await getGuide(guide.id);
          scrollToBottomAfterTransitionRef.current = true;
          setGuide(full.guide);
        }
      } catch { /* ignore transient errors */ }
    }

    const timer = setInterval(poll, 500);
    poll();
    return () => { stopped = true; clearInterval(timer); };
  }, [guide?.id, guide?.status]);

  // Auto-scroll as sections arrive
  useEffect(() => {
    if (guide?.status !== 'pending' || userScrolledRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamingSections.length, guide?.status]);

  // Scroll to bottom when streaming completes and the full guide view renders
  useEffect(() => {
    if (!scrollToBottomAfterTransitionRef.current) return;
    scrollToBottomAfterTransitionRef.current = false;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [guide?.status]);

  // Scroll to first new section after a refinement
  useEffect(() => {
    if (scrollToSectionRef.current == null) return;
    const idx = scrollToSectionRef.current;
    scrollToSectionRef.current = null;
    document.getElementById(`section-${idx + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [newSectionIndices]);

  const summary = useMemo(() => {
    if (!guide || guide.status !== 'ready') return null;
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

  async function handleRefine(userPrompt) {
    setIsRefining(true);
    try {
      const data = await refineGuide(guideId, userPrompt);
      const indices = data.newSectionIndices ?? [];
      if (indices.length > 0) scrollToSectionRef.current = indices[0];
      setGuide(data.guide);
      setNewSectionIndices(indices);
    } finally {
      setIsRefining(false);
    }
  }

  async function handleFinalize() {
    setIsFinalizing(true);
    setNewSectionIndices([]);
    try {
      await finalizeGuide(guideId, []);
      const data = await getGuide(guideId);
      setGuide(data.guide);
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleShareToggle() {
    const next = !isPublic;
    setIsPublic(next);
    setIsTogglingShare(true);
    try {
      const result = await toggleSharing(guideId, next);
      setIsPublic(result.isPublic);
      if (result.shareUrl) setShareUrl(result.shareUrl);
    } catch {
      setIsPublic(!next);
    } finally {
      setIsTogglingShare(false);
    }
  }

  async function handleCopyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2500);
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

  return (
    <section>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700"
          to={guide.readOnly ? '/report' : '/'}
        >
          <ArrowLeft size={15} />
          {guide.readOnly ? 'Back to Admin Report' : 'Back to Dashboard'}
        </Link>

        {guide.readOnly ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Read-only · admin view
          </span>
        ) : confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{guide.isAdopted ? 'Remove from library?' : 'Delete this guide?'}</span>
            <button
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (guide.isAdopted ? 'Removing…' : 'Deleting…') : guide.isAdopted ? 'Yes, remove' : 'Yes, delete'}
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

      {(guide.status === 'pending' || guide.needsReview) ? (
        /* Compact review-mode header */
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {guide.isAdopted && guide.ownerName ? (
                  <span className="text-xs font-bold uppercase tracking-wide text-teal-700">By {guide.ownerName}</span>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">{formatLearningLevel(guide.learningLevel)}</span>
                )}
                {guide.coverage && guide.coverage !== 'balanced' && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {guide.coverage.charAt(0).toUpperCase() + guide.coverage.slice(1)}
                  </span>
                )}
                {(guide.status === 'pending' ? streamingTags : (summary?.tags ?? [])).map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{tag}</span>
                ))}
              </div>
              <h1 className="mt-1.5 line-clamp-2 text-xl font-bold leading-tight text-slate-950 lg:text-2xl">
                {guide.status === 'pending' ? (streamingTitle || guide.title) : guide.title}
              </h1>
            </div>
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#fbf4e8]">
              {guide.illustrationUrl ? (
                <img className="h-full w-full object-cover" src={guide.illustrationUrl} alt="" />
              ) : (
                <FallbackIllustration title={guide.title} />
              )}
            </div>
          </div>
          {guide.needsReview && (
            <InlineHeaderRefinement
              onRefine={handleRefine}
              isRefining={isRefining}
              onFinalize={handleFinalize}
              isFinalizing={isFinalizing}
            />
          )}
        </div>
      ) : (
        /* Full hero */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

          <div className="lg:grid lg:h-64 lg:grid-cols-[minmax(0,1fr)_384px]">

            <div className="flex flex-col gap-3 p-5 lg:overflow-hidden lg:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {guide.isAdopted && guide.ownerName ? (
                  <span className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    By {guide.ownerName}
                  </span>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {formatLearningLevel(guide.learningLevel)}
                  </span>
                )}
                {guide.coverage && guide.coverage !== 'balanced' && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {guide.coverage.charAt(0).toUpperCase() + guide.coverage.slice(1)}
                  </span>
                )}
                {summary.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="line-clamp-2 text-2xl font-bold leading-tight text-slate-950 lg:text-3xl">{guide.title}</h1>

              <div className="max-w-sm">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{summary.subtopicPct}% complete</span>
                  <span className="text-xs text-slate-400">{summary.completed} of {summary.total} topics done</span>
                </div>
                <progress className="h-2 w-full overflow-hidden rounded-full" max="100" value={summary.subtopicPct}>
                  {summary.subtopicPct}%
                </progress>
              </div>

              <div className="flex flex-wrap gap-3">
                {summary.nextTopic && (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    onClick={() => document.getElementById(`section-${summary.nextIndex + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    <Layers size={17} />
                    {summary.subtopicPct === 100 ? 'Review guide' : summary.completed === 0 ? 'Start learning' : 'Continue'}
                  </button>
                )}
                {!guide.isAdopted && guide.outline?.sections?.some((s) => s.items?.some((item) => item.devStatus === 'pending' || item.devStatus === 'failed')) && (
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
                    onClick={handleDevelop}
                  >
                    {guide.isBeingDeveloped ? 'Developing…' : 'Resume development'}
                  </button>
                )}
              </div>
            </div>

            <div className="aspect-[3/2] border-t border-slate-100 bg-[#fbf4e8] lg:aspect-auto lg:border-l lg:border-t-0">
              {guide.illustrationUrl ? (
                <img className="h-full w-full object-cover" src={guide.illustrationUrl} alt={`${guide.title} illustration`} />
              ) : (
                <FallbackIllustration title={guide.title} />
              )}
            </div>
          </div>

          {!guide.isAdopted && (
            <div className="border-t border-slate-100">
              {isPublic ? (
                <div className="px-5 py-4 lg:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100">
                        <CheckCircle size={16} className="text-emerald-600" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">Shared publicly</span>
                          {guide.adoptionCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                              <Users size={11} />
                              {guide.adoptionCount} {guide.adoptionCount === 1 ? 'adoption' : 'adoptions'}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">Visible in Discover — anyone can adopt it</p>
                      </div>
                    </div>
                    <button
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 disabled:opacity-50"
                      disabled={isTogglingShare}
                      onClick={handleShareToggle}
                    >
                      Make private
                    </button>
                  </div>
                  {shareUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="w-0 min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-500">
                        {shareUrl}
                      </span>
                      <button
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                        onClick={handleCopyShareLink}
                      >
                        <Link2 size={12} />
                        {shareLinkCopied ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100">
                      <Share2 size={16} className="text-teal-700" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Share this guide</p>
                      <p className="mt-0.5 text-xs text-slate-500">Let others discover and adopt it from the community</p>
                    </div>
                  </div>
                  <button
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
                    disabled={isTogglingShare}
                    onClick={handleShareToggle}
                  >
                    <Share2 size={14} />
                    {isTogglingShare ? 'Sharing…' : 'Share publicly'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {guide.status === 'pending' && (
        <BuildingPanel visibleCount={streamingSections.filter((s) => s.title?.trim()).length} />
      )}
      {guide.status === 'pending' && (
        <RefinementPanel onRefine={handleRefine} isRefining={isRefining} onFinalize={handleFinalize} isFinalizing={isFinalizing} disabled />
      )}

      {/* Topic list */}
      {guide.status === 'pending' ? (
        <>
          <style>{`@keyframes sectionIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
          <div className="mt-6 grid gap-3">
            {streamingSections.map((section, i) => section.title?.trim() && (
              <div
                key={i}
                style={{ animation: 'sectionIn 0.35s ease both' }}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                    {section.description && <p className="mt-0.5 text-xs text-slate-500">{section.description}</p>}
                  </div>
                </div>
                {section.items?.some((item) => item.title?.trim()) && (
                  <ul className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-1.5">
                    {section.items.map((item, j) => item.title?.trim() && (
                      <li key={j} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <SectionSkeleton />
            <SectionSkeleton />
            <div ref={bottomRef} />
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            {guide.outline.sections.map((section, sectionIndex) => (
              <TopicRow
                key={`${section.title}-${sectionIndex}`}
                section={section}
                sectionIndex={sectionIndex}
                topic={guide.topics[sectionIndex]}
                isNext={!guide.needsReview && summary && sectionIndex === summary.nextIndex}
                isNew={guide.needsReview && newSectionIndices.includes(sectionIndex)}
                onRetry={handleDevelop}
                isReviewMode={guide.needsReview}
              />
            ))}
          </div>
          {guide.needsReview && (
            <TrailingRefinementCard
              onRefine={handleRefine}
              isRefining={isRefining}
              onFinalize={handleFinalize}
              isFinalizing={isFinalizing}
            />
          )}
        </>
      )}

      {guide.status === 'ready' && !guide.needsReview && <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.063a.75.75 0 0 1-1.062-1.061l1.061-1.062a.75.75 0 0 1 1.06 0ZM3 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3ZM15.5 9.25a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5h-1.5ZM6.172 13.768a.75.75 0 0 0-1.06 1.06l1.06 1.062a.75.75 0 0 0 1.062-1.061l-1.062-1.061ZM14.89 14.828a.75.75 0 0 0-1.061-1.06l-1.062 1.06a.75.75 0 1 0 1.061 1.062l1.062-1.062ZM10 15.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15.5ZM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        </svg>
        AI-generated content — verify important information independently.
      </p>}
    </section>
  );
}
