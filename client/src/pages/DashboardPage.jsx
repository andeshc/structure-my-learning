import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { deleteGuide, listGuides } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

const tagThemes = [
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
];

function minutesForGuide(guide) {
  return Math.max(guide.topicCount || 1, 1) * 25 + Math.max(guide.completedTopicCount || 0, 0) * 10;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function guideTags(guide) {
  if (guide.outline && Array.isArray(guide.outline.tags) && guide.outline.tags.length > 0) {
    return guide.outline.tags.slice(0, 2);
  }

  const lower = guide.title.toLowerCase();

  if (lower.includes('transformer') || lower.includes('deep') || lower.includes('model')) {
    return ['AI / ML', 'Deep Learning'];
  }

  if (lower.includes('water') || lower.includes('cycle') || lower.includes('earth')) {
    return ['Science', 'Earth'];
  }

  if (lower.includes('strategy') || lower.includes('product') || lower.includes('business')) {
    return ['Business', 'Strategy'];
  }

  const words = guide.title.split(/\s+/).filter((word) => word.length > 3);
  const level = guide.ageLevel.replaceAll('_', ' ');
  return [words[0] || 'Learning', words[1] || level].slice(0, 2);
}

function displayGuideTitle(title) {
  return title.replace(/\s+(roadmap|guide)$/i, '');
}

function EmptyIllustration() {
  return (
    <svg className="h-48 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="New learning guide illustration">
      <rect width="420" height="220" className="fill-blue-50" />
      <circle cx="88" cy="72" r="32" className="fill-blue-200" />
      <circle cx="320" cy="74" r="42" className="fill-amber-200" />
      <rect x="125" y="50" width="170" height="122" rx="18" className="fill-white stroke-blue-200" strokeWidth="4" />
      <path d="M150 84h118M150 112h86M150 140h104" className="stroke-slate-400" strokeWidth="8" strokeLinecap="round" />
      <path d="M310 136l18 18 42-54" className="fill-none stroke-emerald-500" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TransformerIllustration() {
  return (
    <svg className="h-48 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Transformer architecture illustration">
      <rect width="420" height="220" className="fill-[#fbf4e8]" />
      <g className="stroke-slate-700" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M98 92h56M98 144h56M268 92h56M268 144h56" />
        <path d="M154 92h28M238 92h30M154 144h28M238 144h30" />
        <path d="M210 54v34M210 154v34" />
      </g>
      <rect x="182" y="56" width="56" height="108" rx="12" className="fill-blue-100 stroke-slate-700" strokeWidth="3" />
      <rect x="194" y="68" width="32" height="20" rx="5" className="fill-blue-200 stroke-slate-700" strokeWidth="2" />
      <rect x="194" y="94" width="32" height="20" rx="5" className="fill-emerald-200 stroke-slate-700" strokeWidth="2" />
      <rect x="194" y="120" width="32" height="20" rx="5" className="fill-amber-200 stroke-slate-700" strokeWidth="2" />
      <rect x="194" y="146" width="32" height="10" rx="4" className="fill-orange-200 stroke-slate-700" strokeWidth="2" />
      <rect x="62" y="122" width="44" height="46" rx="7" className="fill-blue-100 stroke-blue-300" strokeWidth="2" />
      <path d="M72 122v46M84 122v46M96 122v46M62 134h44M62 148h44" className="stroke-blue-300" strokeWidth="2" />
      <rect x="306" y="110" width="48" height="58" rx="7" className="fill-violet-100 stroke-slate-700" strokeWidth="2" />
      <path d="M318 130h24M318 146h20" className="stroke-violet-500" strokeWidth="3" strokeLinecap="round" />
      <g className="fill-amber-200">
        <circle cx="26" cy="32" r="3" /><circle cx="42" cy="32" r="3" /><circle cx="58" cy="32" r="3" />
        <circle cx="26" cy="48" r="3" /><circle cx="42" cy="48" r="3" /><circle cx="58" cy="48" r="3" />
        <circle cx="356" cy="136" r="3" /><circle cx="372" cy="136" r="3" /><circle cx="388" cy="136" r="3" />
      </g>
    </svg>
  );
}

function MatrixIllustration() {
  return (
    <svg className="h-48 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Matrix multiplication illustration">
      <rect width="420" height="220" className="fill-[#fbf4e8]" />
      <g className="fill-amber-200">
        <circle cx="26" cy="32" r="3" /><circle cx="42" cy="32" r="3" /><circle cx="58" cy="32" r="3" />
        <circle cx="26" cy="48" r="3" /><circle cx="42" cy="48" r="3" /><circle cx="58" cy="48" r="3" />
        <circle cx="362" cy="142" r="3" /><circle cx="378" cy="142" r="3" /><circle cx="394" cy="142" r="3" />
      </g>
      <g className="fill-slate-700 text-[14px] font-bold">
        <text x="102" y="58">A</text>
        <text x="205" y="58">B</text>
        <text x="312" y="58">C</text>
      </g>
      <g className="fill-white stroke-slate-700" strokeWidth="2.5">
        <rect x="72" y="72" width="76" height="64" rx="6" />
        <rect x="180" y="60" width="64" height="88" rx="6" />
        <rect x="286" y="72" width="76" height="64" rx="6" />
      </g>
      <g className="stroke-blue-300" strokeWidth="1.7">
        <path d="M72 93h76M72 115h76M97 72v64M123 72v64" />
        <path d="M180 82h64M180 104h64M180 126h64M201 60v88M222 60v88" />
        <path d="M286 93h76M286 115h76M311 72v64M337 72v64" />
      </g>
      <rect x="72" y="93" width="76" height="22" className="fill-blue-200" opacity=".7" />
      <rect x="201" y="60" width="21" height="88" className="fill-emerald-200" opacity=".8" />
      <rect x="311" y="93" width="26" height="22" className="fill-violet-100" opacity=".95" />
      <g className="fill-none stroke-slate-700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M156 104h16M166 96l8 8-8 8M252 104h18M264 96l8 8-8 8" />
      </g>
      <path d="M110 115c45 58 142 58 214 0" className="fill-none stroke-emerald-400" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function WaterIllustration() {
  return (
    <svg className="h-48 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Water cycle illustration">
      <rect width="420" height="220" className="fill-sky-50" />
      <path d="M0 168c70-42 118-42 180-12 62 30 120 22 240-10v74H0z" className="fill-cyan-300" />
      <path d="M0 178c70-22 120-12 180 8 72 24 132 8 240-16v50H0z" className="fill-teal-500" opacity=".75" />
      <path d="M38 168l62-88 42 72 36-48 58 64z" className="fill-sky-300" />
      <path d="M70 168l38-54 28 54z" className="fill-blue-200" />
      <circle cx="300" cy="70" r="24" className="fill-amber-400" />
      <path d="M210 50c36-26 80-22 112 8M322 58l-12-23M322 58l-28-2M310 136c35-10 54-30 60-66M370 70l12 24M370 70l-24 10" className="fill-none stroke-blue-600" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <g className="fill-sky-300">
        <ellipse cx="78" cy="58" rx="28" ry="16" />
        <ellipse cx="110" cy="54" rx="24" ry="18" />
        <ellipse cx="135" cy="64" rx="31" ry="15" />
        <ellipse cx="238" cy="104" rx="28" ry="14" />
        <ellipse cx="268" cy="98" rx="23" ry="17" />
      </g>
      <g className="stroke-sky-500" strokeWidth="5" strokeLinecap="round">
        <path d="M72 92l-6 14M102 91l-6 14M132 92l-6 14M245 132l-6 14M274 130l-6 14" />
      </g>
    </svg>
  );
}

function StrategyIllustration() {
  return (
    <svg className="h-48 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Strategy illustration">
      <rect width="420" height="220" className="fill-[#fbf4e8]" />
      <circle cx="105" cy="112" r="67" className="fill-red-100 stroke-slate-800" strokeWidth="3" />
      <circle cx="105" cy="112" r="48" className="fill-white stroke-red-300" strokeWidth="12" />
      <circle cx="105" cy="112" r="24" className="fill-red-100 stroke-red-300" strokeWidth="10" />
      <circle cx="105" cy="112" r="7" className="fill-red-500" />
      <path d="M108 110l102-64" className="stroke-blue-700" strokeWidth="6" strokeLinecap="round" />
      <path d="M204 50l36-14-12 32z" className="fill-blue-500 stroke-slate-800" strokeWidth="3" />
      <g transform="translate(242 56) rotate(8)">
        <rect x="0" y="0" width="120" height="132" rx="10" className="fill-white stroke-slate-800" strokeWidth="3" />
        <path d="M28 36l12 12M40 36L28 48M78 42l-36 42M42 84l-4-20M42 84l20-2M28 104l12 12M40 104l-12 12" className="stroke-blue-700" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 0v-14M48 0v-14M72 0v-14M96 0v-14" className="stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M230 34l24-18M248 46l28-20M270 52l22-16" className="stroke-slate-300" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function GuideIllustration({ guide, index, title }) {
  if (guide.illustrationUrl) {
    return <img className="h-48 w-full object-cover" src={guide.illustrationUrl} alt={`${title} illustration`} />;
  }

  const lower = title.toLowerCase();

  if (lower.includes('matrix') || lower.includes('linear algebra') || lower.includes('multiplication')) {
    return <MatrixIllustration />;
  }

  if (lower.includes('water') || lower.includes('cycle') || lower.includes('earth')) {
    return <WaterIllustration />;
  }

  if (lower.includes('strategy') || lower.includes('product') || lower.includes('business')) {
    return <StrategyIllustration />;
  }

  if (lower.includes('transformer') || lower.includes('deep') || lower.includes('model')) {
    return <TransformerIllustration />;
  }

  return index % 3 === 1 ? <WaterIllustration /> : index % 3 === 2 ? <StrategyIllustration /> : <TransformerIllustration />;
}

function PendingGuideCard({ guide }) {
  const truncated = guide.prompt && guide.prompt.length > 80 ? guide.prompt.slice(0, 80).trimEnd() + '…' : guide.prompt;
  return (
    <article className="overflow-hidden rounded-xl border border-teal-200 bg-white">
      <div className="relative flex h-48 items-center justify-center border-b border-teal-100 bg-teal-50">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Building</p>
        </div>
      </div>
      <div className="p-5">
        <Link to={`/guides/${guide.id}`} className="block text-base font-semibold leading-snug text-slate-700 hover:text-blue-700">
          "{truncated}"
        </Link>
        <p className="mt-2 text-xs text-slate-400">Your guide is being generated…</p>
      </div>
    </article>
  );
}

function GuideCard({ guide, index, onDelete }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const tags = guideTags(guide);
  const title = displayGuideTitle(guide.title);
  const lessons = guide.topicCount || 0;
  const activities = lessons + Math.max(guide.completedTopicCount || 0, 0);
  const studyMinutes = minutesForGuide(guide);

  useEffect(() => {
    function closeMenu(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-blue-200">
      <div className="relative border-b border-slate-100">
        <GuideIllustration guide={guide} index={index} title={title} />
        <div ref={menuRef} className="absolute right-3 top-3">
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-950 transition-colors hover:border-blue-200 hover:text-blue-700"
            type="button"
            aria-label={`Open menu for ${title}`}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={21} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-slate-200 bg-white p-1" role="menu">
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete(guide);
                }}
              >
                <Trash2 size={16} />
                Delete guide
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <Link to={`/guides/${guide.id}`} className="block text-xl font-bold leading-tight text-slate-950 transition-colors hover:text-blue-700">
          {title}
        </Link>
        <div className="mt-4 flex flex-wrap gap-3">
          {tags.map((tag, tagIndex) => (
            <span key={tag} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tagThemes[(index + tagIndex) % tagThemes.length]}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto] items-center gap-3">
          <progress className="h-3 w-full overflow-hidden rounded-full" max="100" value={guide.progressPercentage}>
            {guide.progressPercentage}%
          </progress>
          <span className="text-lg font-semibold text-slate-950">{guide.progressPercentage}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-2.5 px-3 py-4">
          <FileText className="shrink-0 text-slate-500" size={22} />
          <div className="min-w-0 text-center">
            <p className="text-lg font-bold leading-none text-slate-950">{lessons}</p>
            <p className="mt-1 text-xs text-slate-600">Lessons</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2.5 border-x border-slate-200 px-3 py-4">
          <CheckCircle2 className="shrink-0 text-slate-500" size={22} />
          <div className="min-w-0 text-center">
            <p className="text-lg font-bold leading-none text-slate-950">{activities}</p>
            <p className="mt-1 text-xs text-slate-600">Activities</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2.5 px-3 py-4">
          <Clock3 className="shrink-0 text-slate-500" size={22} />
          <div className="min-w-0 text-center">
            <p className="whitespace-nowrap text-lg font-bold leading-none text-slate-950">{formatDuration(studyMinutes)}</p>
            <p className="mt-1 text-xs text-slate-600">Study time</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatPill({ icon, value, label, color }) {
  return (
    <div className="flex min-w-0 items-center gap-5">
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [guides, setGuides] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function fetchGuides() {
      try {
        const data = await listGuides();
        if (cancelled) return;
        setGuides(data.guides);
        setIsLoading(false);
        if (data.guides.some((g) => g.status === 'pending')) {
          timerId = setTimeout(fetchGuides, 4000);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setIsLoading(false);
        }
      }
    }

    fetchGuides();
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, []);

  const totals = useMemo(() => {
    const lessons = guides.reduce((sum, guide) => sum + (guide.topicCount || 0), 0);
    const completed = guides.reduce((sum, guide) => sum + (guide.completedTopicCount || 0), 0);
    const minutes = guides.reduce((sum, guide) => sum + minutesForGuide(guide), 0);
    const progress = lessons === 0 ? 0 : Math.round((completed / lessons) * 100);

    return {
      lessons,
      completed,
      activities: lessons + completed,
      duration: formatDuration(minutes),
      progress,
    };
  }, [guides]);

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteGuide(deleteTarget.id);
      setGuides((current) => current.filter((guide) => guide.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  if (isLoading) {
    return <LoadingPanel title="Loading dashboard" detail="Fetching your saved learning guides." />;
  }

  return (
    <section>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-5xl font-bold text-slate-950">Dashboard</h1>
        <Link className="relative inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 text-lg font-semibold text-white hover:bg-blue-700" to="/guides/new">
          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/70">
            <Plus size={21} />
          </span>
          New guide
          <span className="absolute -left-11 top-2 hidden text-orange-500 lg:block">
            <svg width="38" height="46" viewBox="0 0 38 46" aria-hidden="true">
              <path d="M31 4l-8 24M8 16l13 14M3 35l17-3" className="fill-none stroke-current" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </Link>
      </div>

      <div className="mt-14">
        <div className="flex items-start gap-4">
          <BookOpen className="mt-1 text-blue-700" size={34} />
          <div>
            <h2 className="text-3xl font-bold">Your learning guides</h2>
            <p className="mt-3 text-lg text-slate-600">Continue where you left off or build something new.</p>
          </div>
        </div>

        {error && <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        {guides.length === 0 ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <EmptyIllustration />
              <div className="p-6">
                <h3 className="text-2xl font-bold">Create your first learning guide</h3>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Turn any topic into a structured roadmap with detailed sections, required concepts, optional depth, and generated lessons.
                </p>
                <Link className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white" to="/guides/new">
                  New guide
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid justify-start gap-8 sm:grid-cols-[repeat(auto-fill,minmax(280px,360px))]">
            {guides.map((guide, index) => (
              guide.status === 'pending'
                ? <PendingGuideCard key={guide.id} guide={guide} />
                : <GuideCard key={guide.id} guide={guide} index={index} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-7">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-slate-200">
          <StatPill icon={<BookOpen className="text-emerald-600" size={34} />} value={totals.completed} label="Lessons completed" color="bg-emerald-100" />
          <div className="xl:pl-9">
            <StatPill icon={<CheckCircle2 className="text-amber-600" size={34} />} value={totals.activities} label="Activities completed" color="bg-amber-100" />
          </div>
          <div className="xl:pl-9">
            <StatPill icon={<Clock3 className="text-blue-600" size={34} />} value={totals.duration} label="Total study time" color="bg-blue-100" />
          </div>
          <div className="xl:pl-9">
            <StatPill icon={<TrendingUp className="text-orange-600" size={34} />} value={`${totals.progress}%`} label="Overall progress" color="bg-orange-100" />
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
                <BarChart3 size={24} />
              </span>
              <div>
                <h2 className="text-xl font-bold">Delete guide?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will permanently delete "{deleteTarget.title}" and all generated topic content.
                </p>
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
