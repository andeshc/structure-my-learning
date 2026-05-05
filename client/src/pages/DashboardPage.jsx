import { Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { listGuides } from '../api/guides';
import { LoadingPanel } from '../components/LoadingPanel';

function progressWidthClass(progress) {
  if (progress >= 100) return 'w-full';
  if (progress >= 75) return 'w-3/4';
  if (progress >= 50) return 'w-1/2';
  if (progress >= 25) return 'w-1/4';
  if (progress > 0) return 'w-[12%]';
  return 'w-0';
}

export function DashboardPage() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listGuides()
      .then((data) => setGuides(data.guides))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
            <Link key={guide.id} to={`/guides/${guide.id}`} className="rounded-lg border border-line bg-paper p-5 transition hover:border-primary">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-primary">{guide.topicCount} topics</span>
                <Sparkles size={18} className="text-amber" />
              </div>
              <h2 className="mt-8 text-xl font-black">{guide.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{guide.prompt}</p>
              <div className="mt-8 flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full bg-progress ${progressWidthClass(guide.progressPercentage)}`} />
                </div>
                <span className="text-sm font-black">{guide.progressPercentage}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
