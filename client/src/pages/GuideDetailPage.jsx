import { ArrowLeft, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getGuide } from '../api/guides';
import { LoadingPanel } from '../components/LoadingPanel';

export function GuideDetailPage() {
  const { guideId } = useParams();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGuide(guideId)
      .then((data) => setGuide(data.guide))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [guideId]);

  if (loading) {
    return <LoadingPanel title="Loading guide" detail="Gathering your topic outline." />;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-5 font-bold text-red-700">{error}</div>;
  }

  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-primary">
        <ArrowLeft size={17} />
        Dashboard
      </Link>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-primary">Guide outline</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{guide.title}</h1>
          <p className="mt-3 text-slate-600">{guide.prompt}</p>
        </div>
        <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-black text-progress">
          {guide.progressPercentage}% complete
        </span>
      </div>

      <div className="mt-8 grid gap-3">
        {guide.topics.map((topic, index) => (
          <Link
            key={topic.id}
            to={`/guides/${guide.id}/topics/${topic.id}`}
            className="grid gap-4 rounded-lg border border-line bg-paper p-4 transition hover:border-primary sm:grid-cols-[44px_1fr_auto]"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-black ${
              topic.isCompleted ? 'bg-green-50 text-progress' : 'bg-blue-50 text-primary'
            }`}>
              {topic.position || index + 1}
            </div>
            <div>
              <h2 className="font-black text-ink">{topic.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{topic.description}</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-black">
              {topic.isCompleted ? <CheckCircle2 size={18} className="text-progress" /> : <Circle size={18} className="text-slate-400" />}
              {topic.hasContent ? 'Ready' : 'Generate'}
              {!topic.hasContent && <Sparkles size={16} className="text-amber" />}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
