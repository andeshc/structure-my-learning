import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { deleteGuide, listGuides } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';
import { useAuth } from '../context/AuthContext';

const tagThemes = [
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
];

// Paired card tint + illustration gradient overlay per theme index
const CARD_THEMES = [
  { cardBg: 'rgba(239,246,255,0.55)',  overlay: 'linear-gradient(135deg, rgba(96,165,250,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(245,243,255,0.55)',  overlay: 'linear-gradient(135deg, rgba(167,139,250,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(240,253,244,0.55)',  overlay: 'linear-gradient(135deg, rgba(52,211,153,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(255,251,235,0.55)',  overlay: 'linear-gradient(135deg, rgba(251,191,36,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(255,241,242,0.55)',  overlay: 'linear-gradient(135deg, rgba(251,113,133,0.28) 0%, transparent 65%)' },
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
    <svg className="h-32 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="New learning guide illustration">
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
    <svg className="h-32 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Transformer architecture illustration">
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
    <svg className="h-32 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Matrix multiplication illustration">
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
    <svg className="h-32 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Water cycle illustration">
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
    <svg className="h-32 w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Strategy illustration">
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
    return <img className="h-32 w-full object-cover" src={guide.illustrationUrl} alt={`${title} illustration`} />;
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

function GuideCard({ guide, index, onDelete }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const tags = guideTags(guide);
  const title = displayGuideTitle(guide.title);
  const topics = guide.topicCount || 0;
  const completedTopics = guide.completedTopicCount || 0;
  const subtopicCount = guide.outline?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;
  const completedSubtopics = guide.completedSubtopicCount || 0;
  const subtopicPct = subtopicCount > 0 ? Math.round((completedSubtopics / subtopicCount) * 100) : 0;
  const isNotStarted = completedTopics === 0 && completedSubtopics === 0;
  const isFinished = subtopicPct === 100;
  const actionLabel = isFinished ? 'Review' : isNotStarted ? 'Begin' : 'Continue';
  const progressText = isNotStarted
    ? `${topics} topic${topics !== 1 ? 's' : ''}`
    : `${completedTopics} of ${topics} topics completed`;

  useEffect(() => {
    function closeMenu(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  const statusBadge = isFinished
    ? { label: 'Complete',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    : isNotStarted
    ? { label: 'Not started', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
    : { label: 'In progress', cls: 'bg-amber-100 text-amber-700 border-amber-200' };

  const ctaCls = isFinished
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-teal-700 hover:bg-teal-800';

  const theme = CARD_THEMES[index % CARD_THEMES.length];

  return (
    <article
      className="overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-teal-200 hover:shadow-[0_0_0_3px_rgba(15,118,110,0.07)]"
      style={{ backgroundColor: theme.cardBg }}
    >
      <div className="relative border-b border-slate-100">
        <GuideIllustration guide={guide} index={index} title={title} />
        {/* Gradient band overlay — tints the illustration with the card's colour */}
        <div className="pointer-events-none absolute inset-0" style={{ background: theme.overlay }} />

        {/* Status badge — bottom-left of illustration */}
        <span className={`absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>

        {/* Menu button */}
        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-slate-950 transition-colors hover:border-teal-200 hover:text-teal-700"
            type="button"
            aria-label={`Open menu for ${title}`}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={15} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-slate-200 bg-white p-1" role="menu">
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete(guide);
                }}
              >
                <Trash2 size={14} />
                Delete guide
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <Link to={`/guides/${guide.id}`} className="block min-h-[2.5rem] line-clamp-2 text-base font-bold leading-tight text-slate-950 transition-colors hover:text-teal-700">
          {title}
        </Link>

        {/* Topic count chip */}
        <p className="mt-1.5 text-xs font-medium text-slate-400">
          {topics} topic{topics !== 1 ? 's' : ''}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag, tagIndex) => (
            <span key={tag} className={`rounded px-2 py-0.5 text-xs font-semibold ${tagThemes[(index + tagIndex) % tagThemes.length]}`}>
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-2">
          <progress className="h-1.5 w-full overflow-hidden rounded-full" max="100" value={subtopicPct}>
            {subtopicPct}%
          </progress>
          <span className="text-sm font-semibold text-slate-950">{subtopicPct}%</span>
        </div>
      </div>

      {/* Bolder CTA footer */}
      <Link
        to={`/guides/${guide.id}`}
        className={`flex items-center justify-between px-4 py-3 text-sm font-semibold text-white transition-colors ${ctaCls}`}
      >
        <span className="text-xs font-medium opacity-75">{progressText}</span>
        <span>{actionLabel} →</span>
      </Link>
    </article>
  );
}

function StatCard({ icon, value, label, iconBg, bar }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-slate-950">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [guides, setGuides] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function fetchGuides() {
      try {
        const data = await listGuides();
        if (cancelled) return;
        setGuides(data.guides);
        setIsLoading(false);
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
      {/* Full-bleed branded header — negative margins escape AppShell's padding */}
      <div className="relative -mx-5 -mt-7 mb-8 overflow-hidden sm:-mx-8 sm:-mt-7 lg:-mx-16 lg:-mt-12">
        {/* Fine-line teal grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(15,118,110,0.10) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(15,118,110,0.10) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '40px 40px',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          }}
        />
        {/* Color blooms */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 60% 120% at 0% 0%, rgba(99,102,241,0.10) 0%, transparent 60%)',
              'radial-gradient(ellipse 60% 120% at 50% 0%, rgba(15,118,110,0.09) 0%, transparent 60%)',
              'radial-gradient(ellipse 40% 80% at 100% 0%, rgba(251,146,60,0.07) 0%, transparent 55%)',
            ].join(', '),
          }}
        />
        <div className="relative px-5 py-8 sm:px-8 lg:px-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">My library</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-slate-950">
              Welcome back, <span className="bg-gradient-to-r from-teal-600 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">{firstName}.</span>
            </h1>
            <Link className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800" to="/guides/new">
              <Plus size={16} />
              New guide
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="h-5 w-0.5 rounded-full bg-teal-700" />
          <BookOpen className="text-teal-700" size={20} />
          <h2 className="text-lg font-bold">Your learning guides</h2>
        </div>

        {error && <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        {guides.length === 0 ? (
          <div className="mt-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <EmptyIllustration />
              <div className="p-5">
                <h3 className="text-lg font-bold">Create your first learning guide</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Turn any topic into a structured roadmap with detailed sections, required concepts, optional depth, and generated lessons.
                </p>
                <Link className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" to="/guides/new">
                  New guide
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(260px,340px))] sm:justify-start">
            {guides.map((guide, index) => (
              <GuideCard key={guide.id} guide={guide} index={index} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<BookOpen className="text-emerald-600" size={20} />} value={totals.completed} label="Lessons completed" iconBg="bg-emerald-100" bar="bg-emerald-500" />
        <StatCard icon={<CheckCircle2 className="text-amber-600" size={20} />} value={totals.activities} label="Activities completed" iconBg="bg-amber-100" bar="bg-amber-500" />
        <StatCard icon={<Clock3 className="text-teal-600" size={20} />} value={totals.duration} label="Total study time" iconBg="bg-teal-100" bar="bg-teal-600" />
        <StatCard icon={<TrendingUp className="text-indigo-600" size={20} />} value={`${totals.progress}%`} label="Overall progress" iconBg="bg-indigo-100" bar="bg-indigo-500" />
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
