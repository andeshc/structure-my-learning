import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  PlayCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getGuide } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

const tagThemes = [
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
];

function importanceClass(importance) {
  if (importance === 'Required') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (importance === 'Optional and can be skipped') {
    return 'bg-slate-100 text-slate-500';
  }

  return 'bg-amber-50 text-amber-700';
}

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

  if (hours === 0) {
    return `${mins}m`;
  }

  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function estimatedMinutes(guide) {
  return Math.max(guide.topicCount || guide.topics.length || 1, 1) * 25;
}

function topicAction(topic) {
  if (!topic) {
    return 'Open section';
  }

  if (topic.isCompleted) {
    return 'Review lesson';
  }

  return topic.hasContent ? 'Continue lesson' : 'Start lesson';
}

function statusLabel(topic) {
  if (!topic) {
    return 'Unavailable';
  }

  if (topic.isCompleted) {
    return 'Complete';
  }

  return topic.hasContent ? 'In progress' : 'Not started';
}

function statusClass(topic) {
  if (topic?.isCompleted) {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (topic?.hasContent) {
    return 'bg-blue-50 text-blue-700';
  }

  return 'bg-slate-100 text-slate-600';
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

function OutlineItems({ items }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ol className="mt-5 grid gap-3">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="grid gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 sm:grid-cols-[2rem_1fr]">
          <span className="text-sm font-semibold text-slate-400">{index + 1}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${importanceClass(item.importance)}`}>
                {item.importance}
              </span>
              <span className="font-medium text-slate-950">{item.title}</span>
            </div>
            {item.details && item.details.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                {item.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StatBlock({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-slate-950">{value}</p>
        <p className="text-xs text-slate-600">{label}</p>
      </div>
    </div>
  );
}

function ModuleCard({ section, sectionIndex, topic }) {
  return (
    <section id={`section-${sectionIndex + 1}`} className="scroll-mt-8 rounded-xl border border-slate-200 bg-[#fffdfa]">
      <div className="flex flex-col gap-5 border-b border-slate-100 p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
              {sectionIndex + 1}
            </span>
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClass(topic)}`}>
              {statusLabel(topic)}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold leading-tight text-slate-950">{section.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{section.description}</p>
        </div>
        {topic && (
          <Link className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:border-blue-200 hover:text-blue-700" to={`/topics/${topic.id}`}>
            {topicAction(topic)}
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      <div className="p-5">
        <OutlineItems items={section.items} />

        {section.subsections && section.subsections.length > 0 && (
          <div className="mt-6 grid gap-5">
            {section.subsections.map((subsection) => (
              <div key={subsection.title} className="rounded-lg border border-slate-100 bg-white p-4">
                <h3 className="text-lg font-semibold text-slate-950">{subsection.title}</h3>
                <OutlineItems items={subsection.items} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function GuideDetailPage() {
  const { guideId } = useParams();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getGuide(guideId)
      .then((data) => setGuide(data.guide))
      .catch((loadError) => setError(loadError.message));
  }, [guideId]);

  const summary = useMemo(() => {
    if (!guide) {
      return null;
    }

    const completed = guide.topics.filter((topic) => topic.isCompleted).length;
    const nextTopic = guide.topics.find((topic) => !topic.isCompleted) || guide.topics[0];
    const nextIndex = nextTopic ? guide.topics.findIndex((topic) => topic.id === nextTopic.id) : -1;

    return {
      completed,
      duration: formatDuration(estimatedMinutes(guide)),
      nextIndex,
      nextTopic,
      tags: guideTags(guide),
      total: guide.topicCount || guide.topics.length,
    };
  }, [guide]);

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!guide || !summary) {
    return <LoadingPanel title="Loading guide" detail="Fetching the stored outline." />;
  }

  return (
    <section>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase text-blue-700">{guide.ageLevel.replaceAll('_', ' ')}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-slate-950">{guide.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{guide.prompt}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              {summary.tags.map((tag, index) => (
                <span key={tag} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tagThemes[index % tagThemes.length]}`}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-slate-700">Progress</span>
                <span className="font-bold text-slate-950">{guide.progressPercentage}%</span>
              </div>
              <progress className="h-3 w-full overflow-hidden rounded-full" max="100" value={guide.progressPercentage}>
                {guide.progressPercentage}%
              </progress>
              <p className="mt-2 text-sm text-slate-600">{summary.completed} of {summary.total} lessons complete</p>
            </div>

            {summary.nextTopic && (
              <Link className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700" to={`/topics/${summary.nextTopic.id}`}>
                <PlayCircle size={20} />
                {summary.completed === summary.total ? 'Review guide' : `Continue: ${summary.nextTopic.title}`}
              </Link>
            )}
          </div>

          <div className="min-h-[260px] border-t border-slate-200 bg-[#fbf4e8] lg:border-l lg:border-t-0">
            {guide.illustrationUrl ? (
              <img className="h-full min-h-[260px] w-full object-cover" src={guide.illustrationUrl} alt={`${guide.title} illustration`} />
            ) : (
              <FallbackIllustration title={guide.title} />
            )}
          </div>
        </div>

        <div className="grid gap-5 border-t border-slate-200 bg-[#fffdfa] p-5 md:grid-cols-3">
          <StatBlock icon={<BookOpen size={22} />} value={summary.total} label="Lessons" />
          <StatBlock icon={<CheckCircle2 size={22} />} value={summary.completed} label="Completed" />
          <StatBlock icon={<Clock3 size={22} />} value={summary.duration} label="Estimated time" />
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-8 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <ListChecks size={18} />
              Guide outline
            </div>
            <nav className="mt-4 grid gap-1">
              {guide.outline.sections.map((section, index) => {
                const topic = guide.topics[index];
                const isNext = index === summary.nextIndex;

                return (
                  <a key={`${section.title}-${index}`} className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${isNext ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`} href={`#section-${index + 1}`}>
                    <span className="mt-0.5 text-xs font-bold">{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{section.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{statusLabel(topic)}</span>
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center gap-3">
            <FileText className="text-blue-700" size={26} />
            <h2 className="text-3xl font-bold text-slate-950">Guide outline</h2>
          </div>
          <div className="grid gap-6">
            {guide.outline.sections.map((section, sectionIndex) => (
              <ModuleCard
                key={`${section.title}-${sectionIndex}`}
                section={section}
                sectionIndex={sectionIndex}
                topic={guide.topics[sectionIndex]}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
