import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Folder,
  FolderPlus,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { listCollections, reorderCollections } from '../api/collections';
import { deleteGuide, listGuides } from '../api/guides';
import AddToCollectionMenu from '../components/AddToCollectionMenu';
import CollectionCard from '../components/CollectionCard';
import CreateCollectionModal from '../components/CreateCollectionModal';
import GuideCard, { displayGuideTitle } from '../components/GuideCard';
import LoadingPanel from '../components/LoadingPanel';
import { useAuth } from '../context/AuthContext';

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

function EmptyIllustration() {
  return (
    <svg className="h-full w-full" viewBox="0 0 420 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="New learning guide illustration">
      <rect width="420" height="220" className="fill-blue-50" />
      <circle cx="88" cy="72" r="32" className="fill-blue-200" />
      <circle cx="320" cy="74" r="42" className="fill-amber-200" />
      <rect x="125" y="50" width="170" height="122" rx="18" className="fill-white stroke-blue-200" strokeWidth="4" />
      <path d="M150 84h118M150 112h86M150 140h104" className="stroke-slate-400" strokeWidth="8" strokeLinecap="round" />
      <path d="M310 136l18 18 42-54" className="fill-none stroke-emerald-500" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [addToCollectionTarget, setAddToCollectionTarget] = useState(null);
  const [dragColIndex, setDragColIndex] = useState(null);
  const [dragOverColIndex, setDragOverColIndex] = useState(null);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const [guideData, collectionData] = await Promise.all([
          listGuides(),
          listCollections(),
        ]);
        if (cancelled) return;
        setGuides(guideData.guides);
        setCollections(collectionData.collections || []);
        setIsLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setIsLoading(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshCollections() {
    try {
      const data = await listCollections();
      setCollections(data.collections || []);
    } catch {
      // toast handled by api client
    }
  }

  async function refreshGuides() {
    try {
      const data = await listGuides();
      setGuides(data.guides);
    } catch {
      // toast handled by api client
    }
  }

  function handleColDrop(targetIndex) {
    if (dragColIndex === null || dragColIndex === targetIndex) {
      setDragColIndex(null);
      setDragOverColIndex(null);
      return;
    }
    const reordered = [...collections];
    const [moved] = reordered.splice(dragColIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setCollections(reordered);
    setDragColIndex(null);
    setDragOverColIndex(null);
    reorderCollections(reordered.map((c) => c.id)).catch(() => refreshCollections());
  }

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

      {collections.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-0.5 rounded-full bg-teal-700" />
              <Folder className="text-teal-700" size={20} />
              <h2 className="text-lg font-bold">Collections</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateCollectionOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              <Plus size={15} /> New collection
            </button>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {collections.map((collection, index) => (
              <div
                key={collection.id}
                draggable
                onDragStart={() => setDragColIndex(index)}
                onDragEnter={() => setDragOverColIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleColDrop(index)}
                onDragEnd={() => { setDragColIndex(null); setDragOverColIndex(null); }}
                className={`shrink-0 cursor-grab active:cursor-grabbing ${dragColIndex === index ? 'opacity-40' : ''} ${dragOverColIndex === index && dragColIndex !== index ? 'rounded-xl ring-2 ring-teal-400' : ''}`}
              >
                <CollectionCard collection={collection} index={index} />
              </div>
            ))}
          </div>
        </div>
      )}

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
              <GuideCard
                key={guide.id}
                guide={guide}
                index={index}
                onDelete={setDeleteTarget}
                extraMenu={[
                  {
                    label: 'Add to collection',
                    icon: <FolderPlus size={14} />,
                    onSelect: () => setAddToCollectionTarget(guide),
                    destructive: false,
                  },
                ]}
              />
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
                <h2 className="text-xl font-bold">{deleteTarget.isAdopted ? 'Remove from library?' : 'Delete guide?'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {deleteTarget.isAdopted
                    ? `This will remove "${deleteTarget.title}" from your library. The original guide will not be affected.`
                    : `This will permanently delete "${deleteTarget.title}" and all generated topic content.`}
                </p>
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={confirmDelete}>
                {deleteTarget.isAdopted ? 'Remove' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateCollectionOpen && (
        <CreateCollectionModal
          onClose={() => setIsCreateCollectionOpen(false)}
          onCreated={(collection) => {
            setCollections((current) => [...current, collection]);
            setIsCreateCollectionOpen(false);
          }}
        />
      )}

      {addToCollectionTarget && (
        <AddToCollectionMenu
          guideId={addToCollectionTarget.id}
          guideTitle={displayGuideTitle(addToCollectionTarget.title)}
          onClose={() => setAddToCollectionTarget(null)}
          onChanged={() => { refreshCollections(); refreshGuides(); }}
        />
      )}
    </section>
  );
}
