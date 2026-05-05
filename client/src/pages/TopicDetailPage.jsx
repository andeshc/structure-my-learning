import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router';
import { getTopic, updateTopicProgress } from '../api/guides';
import { LoadingPanel } from '../components/LoadingPanel';

export function TopicDetailPage() {
  const { guideId, topicId } = useParams();
  const [topic, setTopic] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopic(topicId)
      .then((data) => setTopic(data.topic))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [topicId]);

  async function toggleComplete() {
    try {
      const data = await updateTopicProgress(topic.id, !topic.isCompleted);
      setTopic((current) => ({
        ...current,
        isCompleted: data.topic.isCompleted,
        completedAt: data.topic.completedAt
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <LoadingPanel title="Generating lesson" detail="Writing, storing, and preparing your topic content." />;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-5 font-bold text-red-700">{error}</div>;
  }

  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <Link to={`/guides/${guideId}`} className="inline-flex items-center gap-2 text-sm font-black text-primary">
        <ArrowLeft size={17} />
        Back to outline
      </Link>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-primary">Topic {topic.position}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{topic.title}</h1>
          <p className="mt-3 text-slate-600">{topic.guideTitle}</p>
        </div>
        <button
          type="button"
          onClick={toggleComplete}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 font-black shadow-soft ${
            topic.isCompleted ? 'bg-green-50 text-progress' : 'bg-progress text-white'
          }`}
        >
          <CheckCircle2 size={18} />
          {topic.isCompleted ? 'Completed' : 'Mark complete'}
        </button>
      </div>

      <article className="prose prose-slate mt-8 max-w-none prose-headings:font-black prose-a:text-primary">
        <ReactMarkdown>{topic.contentMarkdown}</ReactMarkdown>
      </article>
    </section>
  );
}
