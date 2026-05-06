import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getGuide } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

export default function GuideDetailPage() {
  const { guideId } = useParams();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getGuide(guideId)
      .then((data) => setGuide(data.guide))
      .catch((loadError) => setError(loadError.message));
  }, [guideId]);

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!guide) {
    return <LoadingPanel title="Loading guide" detail="Fetching the stored outline." />;
  }

  return (
    <section>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-teal-700">{guide.ageLevel.replaceAll('_', ' ')}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{guide.title}</h1>
          <p className="mt-2 max-w-2xl text-charcoal-400">{guide.prompt}</p>
        </div>
        <div className="text-sm text-charcoal-400">{guide.progressPercentage}% complete</div>
      </div>

      <div className="mt-8 grid gap-3">
        {guide.topics.map((topic) => (
          <Link key={topic.id} className="rounded-lg border border-charcoal/10 bg-white p-5 transition hover:border-teal-700/40" to={`/topics/${topic.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-charcoal-400">Topic {topic.position}</p>
                <h2 className="mt-1 text-lg font-semibold">{topic.title}</h2>
                <p className="mt-2 text-sm leading-6 text-charcoal-400">{topic.description}</p>
              </div>
              <span className="shrink-0 rounded-full border border-charcoal/10 px-3 py-1 text-xs text-charcoal-400">
                {topic.isCompleted ? 'Done' : topic.hasContent ? 'Ready' : 'Generate'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
