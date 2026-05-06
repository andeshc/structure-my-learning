import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, useParams } from 'react-router';
import { getTopic, updateTopicProgress } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

export default function TopicDetailPage() {
  const { topicId } = useParams();
  const [guide, setGuide] = useState(null);
  const [topic, setTopic] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getTopic(topicId)
      .then((data) => {
        setGuide(data.guide);
        setTopic(data.topic);
      })
      .catch((loadError) => setError(loadError.message));
  }, [topicId]);

  async function toggleProgress() {
    setIsSaving(true);

    try {
      const data = await updateTopicProgress(topic.id, !topic.isCompleted);
      setTopic((current) => ({
        ...current,
        isCompleted: data.topic.isCompleted,
        completedAt: data.topic.completedAt,
      }));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!topic || !guide) {
    return <LoadingPanel title="Generating topic content" detail="If this topic has no stored lesson yet, the server is generating and saving it now." />;
  }

  return (
    <article>
      <Link className="text-sm font-medium text-teal-700" to={`/guides/${guide.id}`}>Back to guide</Link>
      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-charcoal-400">{guide.title} / Topic {topic.position}</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight">{topic.title}</h1>
          <p className="mt-3 max-w-2xl text-charcoal-400">{topic.description}</p>
        </div>
        <button className="rounded-md bg-charcoal px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60" disabled={isSaving} onClick={toggleProgress}>
          {topic.isCompleted ? 'Mark incomplete' : 'Mark complete'}
        </button>
      </div>

      <div className="prose prose-slate mt-8 max-w-none rounded-lg border border-charcoal/10 bg-white p-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.contentMarkdown}</ReactMarkdown>
      </div>
    </article>
  );
}
