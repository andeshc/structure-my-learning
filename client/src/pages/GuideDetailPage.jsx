import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getGuide } from '../api/guides';
import LoadingPanel from '../components/LoadingPanel';

function importanceClass(importance) {
  if (importance === 'Required') {
    return 'bg-teal-50 text-teal-800 border-teal-200';
  }

  if (importance === 'Optional and can be skipped') {
    return 'bg-charcoal/5 text-charcoal-400 border-charcoal/10';
  }

  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function OutlineItems({ items }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ol className="mt-4 space-y-3">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="grid gap-2 sm:grid-cols-[2rem_1fr]">
          <span className="text-sm text-charcoal-400">{index + 1}.</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${importanceClass(item.importance)}`}>
                {item.importance}
              </span>
              <span className="font-medium">{item.title}</span>
            </div>
            {item.details && item.details.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-6 text-charcoal-400">
                {item.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

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

      <div className="mt-8 space-y-8">
        {guide.outline.sections.map((section, sectionIndex) => {
          const topic = guide.topics[sectionIndex];

          return (
            <section key={`${section.title}-${sectionIndex}`} className="border-t border-charcoal/10 pt-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">{sectionIndex + 1}. {section.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-400">{section.description}</p>
                </div>
                {topic && (
                  <Link className="shrink-0 rounded-md border border-charcoal/15 px-4 py-2 text-sm font-medium hover:border-teal-700/40" to={`/topics/${topic.id}`}>
                    {topic.isCompleted ? 'Review lesson' : topic.hasContent ? 'Open lesson' : 'Generate lesson'}
                  </Link>
                )}
              </div>

              <OutlineItems items={section.items} />

              {section.subsections && section.subsections.length > 0 && (
                <div className="mt-6 space-y-6">
                  {section.subsections.map((subsection) => (
                    <div key={subsection.title}>
                      <h3 className="text-lg font-semibold">{subsection.title}</h3>
                      <OutlineItems items={subsection.items} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
