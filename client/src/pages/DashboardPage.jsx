import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { deleteGuide, listGuides } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

export default function DashboardPage() {
  const [guides, setGuides] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    listGuides()
      .then((data) => setGuides(data.guides))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
  }, []);

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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-charcoal-400">Your generated guides, sorted by most recent activity.</p>
        </div>
        <Link className="rounded-md bg-charcoal px-4 py-2.5 text-sm font-medium text-white" to="/guides/new">
          New guide
        </Link>
      </div>

      {error && <p className="mt-5 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {guides.length === 0 ? (
        <div className="mt-8 rounded-lg border border-charcoal/10 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No guides yet</h2>
          <p className="mt-2 text-charcoal-400">Create your first guide from a plain-language learning goal.</p>
          <Link className="mt-5 inline-flex rounded-md bg-charcoal px-4 py-2.5 text-sm font-medium text-white" to="/guides/new">
            Create guide
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {guides.map((guide) => (
            <article key={guide.id} className="rounded-lg border border-charcoal/10 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-700">{guide.ageLevel.replaceAll('_', ' ')}</p>
                  <h2 className="mt-2 text-xl font-semibold">{guide.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-charcoal-400">{guide.prompt}</p>
                </div>
                <button className="rounded-md border border-charcoal/15 px-3 py-1.5 text-sm text-charcoal-400 hover:text-red-700" onClick={() => setDeleteTarget(guide)}>
                  Delete
                </button>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-sm text-charcoal-400">
                  <span>{guide.completedTopicCount} of {guide.topicCount} topics</span>
                  <span>{guide.progressPercentage}%</span>
                </div>
                <progress className="mt-2 h-2 w-full overflow-hidden rounded-full" max="100" value={guide.progressPercentage}>
                  {guide.progressPercentage}%
                </progress>
              </div>

              <Link className="mt-5 inline-flex rounded-md border border-charcoal/15 px-4 py-2 text-sm font-medium" to={`/guides/${guide.id}`}>
                Open guide
              </Link>
            </article>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Delete guide?</h2>
            <p className="mt-2 text-sm leading-6 text-charcoal-400">
              This will permanently delete "{deleteTarget.title}" and all generated topic content.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-md border border-charcoal/15 px-4 py-2 text-sm font-medium" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
