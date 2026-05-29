import { BookOpen, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { listPublicGuides } from '../api/discover';
import LoadingPanel from '../components/LoadingPanel';
import { useAuth } from '../context/AuthContext';

const CARD_THEMES = [
  { cardBg: 'rgba(239,246,255,0.55)',  overlay: 'linear-gradient(135deg, rgba(96,165,250,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(245,243,255,0.55)',  overlay: 'linear-gradient(135deg, rgba(167,139,250,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(240,253,244,0.55)',  overlay: 'linear-gradient(135deg, rgba(52,211,153,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(255,251,235,0.55)',  overlay: 'linear-gradient(135deg, rgba(251,191,36,0.28) 0%, transparent 65%)' },
  { cardBg: 'rgba(255,241,242,0.55)',  overlay: 'linear-gradient(135deg, rgba(251,113,133,0.28) 0%, transparent 65%)' },
];

function displayTitle(title) {
  return title.replace(/\s+(roadmap|guide)$/i, '');
}

function DiscoverIllustration({ guide, index }) {
  if (guide.illustrationUrl) {
    return (
      <img
        className="h-full w-full object-cover"
        src={guide.illustrationUrl}
        alt={`${guide.title} illustration`}
      />
    );
  }
  // Fallback SVG placeholder
  const colors = [
    ['fill-blue-200', 'fill-blue-100'],
    ['fill-violet-200', 'fill-violet-100'],
    ['fill-emerald-200', 'fill-emerald-100'],
    ['fill-amber-200', 'fill-amber-100'],
    ['fill-rose-200', 'fill-rose-100'],
  ];
  const [accent, bg] = colors[index % colors.length];
  return (
    <svg className="h-full w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="420" height="220" className={bg} />
      <circle cx="88" cy="72" r="32" className={accent} />
      <circle cx="320" cy="74" r="42" className={accent} opacity="0.6" />
      <rect x="125" y="50" width="170" height="122" rx="18" className="fill-white" opacity="0.7" />
      <path d="M150 84h118M150 112h86M150 140h104" className="stroke-slate-400" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function DiscoverCard({ guide, index, currentUserId }) {
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const title = displayTitle(guide.title);
  const isOwner = guide.userId === currentUserId;

  return (
    <article
      className="overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-teal-200 hover:shadow-[0_0_0_3px_rgba(15,118,110,0.07)]"
      style={{ backgroundColor: theme.cardBg }}
    >
      <div className="relative aspect-[3/2] overflow-hidden border-b border-slate-100">
        <DiscoverIllustration guide={guide} index={index} />
        <div className="pointer-events-none absolute inset-0" style={{ background: theme.overlay }} />
        {isOwner && (
          <span className="absolute bottom-2 left-2 rounded-full border border-teal-200 bg-teal-100/80 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
            Your guide
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="line-clamp-2 min-h-[2.5rem] text-base font-bold leading-tight text-slate-950">
          {title}
        </p>
        <p className="mt-1.5 text-xs font-medium text-slate-400">
          {guide.topicCount} topic{guide.topicCount !== 1 ? 's' : ''}
          {' · '}by <span className="text-slate-600">{guide.ownerName}</span>
        </p>
      </div>

      {isOwner ? (
        <Link
          to={`/guides/${guide.id}`}
          className="flex items-center justify-end px-4 py-3 text-sm font-semibold text-white transition-colors bg-teal-700 hover:bg-teal-800"
        >
          Open guide →
        </Link>
      ) : guide.viewerHasAdopted ? (
        <div className="flex items-center justify-end px-4 py-3 text-sm font-semibold text-slate-400 bg-slate-50 border-t border-slate-100">
          In your library ✓
        </div>
      ) : (
        <Link
          to={`/share/${guide.shareToken}`}
          className="flex items-center justify-end px-4 py-3 text-sm font-semibold text-white transition-colors bg-teal-700 hover:bg-teal-800"
        >
          Adopt guide →
        </Link>
      )}
    </article>
  );
}

const PAGE_SIZE = 24;

export default function DiscoverPage() {
  const { user } = useAuth();
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchGuides() {
      try {
        const data = await listPublicGuides(0, PAGE_SIZE);
        if (cancelled) return;
        setGuides(data.guides);
        setHasMore(data.guides.length === PAGE_SIZE);
        setOffset(data.guides.length);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchGuides();
    return () => { cancelled = true; };
  }, []);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const data = await listPublicGuides(offset, PAGE_SIZE);
      setGuides((prev) => [...prev, ...data.guides]);
      setHasMore(data.guides.length === PAGE_SIZE);
      setOffset((prev) => prev + data.guides.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) {
    return <LoadingPanel title="Loading Discover" detail="Fetching public guides from the community." />;
  }

  return (
    <section>
      {/* Header */}
      <div className="relative -mx-5 -mt-7 mb-8 overflow-hidden sm:-mx-8 sm:-mt-7 lg:-mx-16 lg:-mt-12">
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Community</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Discover guides
          </h1>
          <p className="mt-1 text-sm text-slate-500">Browse and adopt learning guides shared by the community.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-5 w-0.5 rounded-full bg-teal-700" />
        <BookOpen className="text-teal-700" size={20} />
        <h2 className="text-lg font-bold">Public guides</h2>
      </div>

      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      {guides.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-base font-bold text-slate-950">No public guides yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Be the first to share one — open a guide and toggle it to&nbsp;
            <span className="font-semibold text-teal-700">Public</span>.
          </p>
          <Link
            to="/guides/new"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            <Plus size={15} />
            Create a guide
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(260px,340px))] sm:justify-start">
            {guides.map((guide, index) => (
              <DiscoverCard
                key={guide.id}
                guide={guide}
                index={index}
                currentUserId={user?.id}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700 disabled:opacity-50"
                disabled={isLoadingMore}
                onClick={loadMore}
              >
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
