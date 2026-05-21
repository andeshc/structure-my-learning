import {
  ArrowLeft,
  Layers,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deleteGuide, developGuide, getGuide } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

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
  if (!topic) return 'Unavailable';
  if (topic.isCompleted) return 'Done';
  if (isNext) return 'Next up';
  return 'Ready';
}

function statusClass(topic, isNext) {
  if (topic?.isCompleted) return 'bg-emerald-50 text-emerald-700';
  if (isNext) return 'bg-blue-600 text-white';
  return 'bg-slate-100 text-slate-500';
}


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

function ImportancePill() {
  return null;
}

function dominantBorderClass(items) {
  if (items.some((i) => i.importance === 'Required')) return 'border-l-emerald-400';
  if (items.some((i) => i.importance === 'Optional but recommended')) return 'border-l-amber-300';
  return 'border-l-slate-300';
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

function ItemGroup({ items, borderClass, topicId, onRetry }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 border-l-4 bg-slate-50 ${borderClass}`}>
      <ul className="divide-y divide-slate-100">
        {items.map((item, i) => (
          <li key={i} className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{item.title}</span>
                  <ImportancePill importance={item.importance} />
                </div>
                {item.overview && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.overview}</p>
                )}
              </div>
              {topicId && <SubtopicStatusButton item={item} topicId={topicId} subtopicIndex={i} onRetry={onRetry} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopicRow({ section, sectionIndex, topic, isNext, onRetry }) {
  const hasSubtopics = section.items && section.items.length > 0;

  return (
    <div
      id={`section-${sectionIndex + 1}`}
      className={`scroll-mt-8 rounded-xl border transition-all ${
        isNext ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-4 p-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
          topic?.isCompleted
            ? 'bg-emerald-100 text-emerald-700'
            : isNext
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {sectionIndex + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-950">{section.title}</span>
            <span className={`inline-flex h-5 shrink-0 translate-y-px items-center rounded px-1.5 text-[10px] font-semibold ${statusClass(topic, isNext)}`}>
              {statusLabel(topic, isNext)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>
        </div>
      </div>

      {hasSubtopics && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <ItemGroup items={section.items} borderClass={dominantBorderClass(section.items)} topicId={topic?.id} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}

export default function GuideDetailPage() {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchGuide() {
      try {
        const data = await getGuide(guideId);
        if (cancelled) return;
        setGuide(data.guide);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      }
    }

    fetchGuide();
    return () => { cancelled = true; };
  }, [guideId]);

  useEffect(() => {
    if (!guide) return;
    const urls = guide.outline?.sections
      ?.flatMap((s) => s.items ?? [])
      ?.flatMap((item) => item.illustrationUrls ?? [])
      ?.filter(Boolean) ?? [];
    urls.forEach((url) => { const img = new Image(); img.src = url; });
  }, [guide?.id]);

  useEffect(() => {
    if (!guide?.isBeingDeveloped) return;
    const timer = setInterval(async () => {
      try {
        const data = await getGuide(guideId);
        setGuide(data.guide);
      } catch { /* ignore poll errors */ }
    }, 6000);
    return () => clearInterval(timer);
  }, [guide?.isBeingDeveloped, guideId]);

  const summary = useMemo(() => {
    if (!guide) return null;
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
            {/* Age level + tags */}
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

            {/* Progress */}
            <div className="mt-4 max-w-xs">
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

          <div className="min-h-[220px] border-t border-slate-200 bg-[#fbf4e8] lg:border-l lg:border-t-0">
            {guide.illustrationUrl ? (
              <img className="h-full min-h-[220px] w-full object-cover" src={guide.illustrationUrl} alt={`${guide.title} illustration`} />
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

      {/* AI disclaimer */}
      <p className="mt-8 flex items-center gap-1.5 text-xs text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
          <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.063a.75.75 0 0 1-1.062-1.061l1.061-1.062a.75.75 0 0 1 1.06 0ZM3 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3ZM15.5 9.25a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5h-1.5ZM6.172 13.768a.75.75 0 0 0-1.06 1.06l1.06 1.062a.75.75 0 0 0 1.062-1.061l-1.062-1.061ZM14.89 14.828a.75.75 0 0 0-1.061-1.06l-1.062 1.06a.75.75 0 1 0 1.061 1.062l1.062-1.062ZM10 15.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15.5ZM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
        </svg>
        AI-generated content — verify important information independently.
      </p>
    </section>
  );
}
