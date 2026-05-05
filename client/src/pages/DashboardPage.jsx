import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { deleteGuide, listGuides } from '../api/guides';
import { LoadingPanel } from '../components/LoadingPanel';

function progressWidthClass(progress) {
  if (progress >= 95) return 'w-full';
  if (progress >= 80) return 'w-10/12';
  if (progress >= 70) return 'w-8/12';
  if (progress >= 55) return 'w-7/12';
  if (progress >= 45) return 'w-1/2';
  if (progress >= 30) return 'w-4/12';
  if (progress >= 15) return 'w-2/12';
  if (progress > 0) return 'w-1/12';
  return 'w-0';
}

export function DashboardPage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    listGuides()
      .then((data) => setGuides(data.guides))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function confirmDelete() {
    if (!pendingDelete) return;

    await deleteGuide(pendingDelete.id);
    setGuides((current) => current.filter((guide) => guide.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  if (loading) {
    return <LoadingPanel title="Loading dashboard" detail="Finding your learning guides." />;
  }

  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-primary">Dashboard</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Your learning guides</h1>
          <p className="mt-3 text-slate-600">Continue where you left off or build something new.</p>
        </div>
        <Link to="/guides/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-black text-white shadow-soft">
          <Plus size={18} />
          New guide
        </Link>
      </div>

      {error && <p className="mt-6 rounded-lg bg-red-50 p-4 font-bold text-red-700">{error}</p>}

      {guides.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-paper p-8 text-center">
          <Sparkles className="mx-auto text-amber" size={28} />
          <h2 className="mt-3 text-2xl font-black">No guides yet</h2>
          <p className="mt-2 text-slate-600">Start with one topic and let the app shape the learning path.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {guides.map((guide) => (
            <div key={guide.id} className="rounded-lg border border-line bg-paper p-5 transition hover:border-primary">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-primary">{guide.topicCount} topics</span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(guide)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${guide.title}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <Link to={`/guides/${guide.id}`} className="block">
                <Sparkles size={18} className="mt-8 text-amber" />
                <h2 className="mt-3 text-xl font-black">{guide.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{guide.prompt}</p>
                <div className="mt-8 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-progress ${progressWidthClass(guide.progressPercentage)}`} />
                  </div>
                  <span className="text-sm font-black">{guide.progressPercentage}%</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
            <p className="text-sm font-black uppercase text-red-600">Delete guide</p>
            <h2 className="mt-2 text-2xl font-black">{pendingDelete.title}</h2>
            <p className="mt-3 text-slate-600">This removes the outline, generated lessons, and progress.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-10 rounded-lg border border-line px-4 font-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-10 rounded-lg bg-red-600 px-4 font-black text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
