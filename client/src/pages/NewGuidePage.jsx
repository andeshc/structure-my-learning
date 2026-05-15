import { ChevronLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { getAccessToken } from '../api/client';

const ageLevels = [
  ['ages_8_10', 'Ages 8-10'],
  ['ages_11_13', 'Ages 11-13'],
  ['ages_14_17', 'Ages 14-17'],
  ['adult_beginner', 'Adult beginner'],
  ['adult_advanced', 'Adult advanced'],
];

function SectionSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-slate-200 animate-pulse" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 w-3/5 rounded-full bg-slate-200 animate-pulse" />
        <div className="h-2.5 w-4/5 rounded-full bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

function StreamingView({ prompt, partialOutline, onCancel, error }) {
  const sections = partialOutline?.sections ?? [];
  const title = partialOutline?.title;
  const skeletonCount = Math.max(0, 5 - sections.length);
  const progressPct = sections.length === 0
    ? 8
    : Math.min(90, Math.round((sections.length / 5) * 85) + 8);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <style>{`@keyframes sectionIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>

      <button
        onClick={onCancel}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-700"
      >
        <ChevronLeft size={15} />
        Change prompt
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Building your guide</p>
      <p className="mt-2 text-xl font-semibold leading-snug text-slate-800 line-clamp-2">"{prompt}"</p>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${progressPct}%`, transition: 'width 0.6s ease' }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {sections.length === 0
          ? 'Generating outline…'
          : `${sections.length} section${sections.length === 1 ? '' : 's'} ready`}
      </p>

      {title && (
        <h2 className="mt-8 text-2xl font-bold text-slate-950">{title}</h2>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {sections.map((section, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            style={{ animation: 'sectionIn 0.35s ease forwards' }}
          >
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{section.title}</p>
              {section.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">{section.description}</p>
              )}
            </div>
          </div>
        ))}
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SectionSkeleton key={`sk-${i}`} />
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

export default function NewGuidePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [ageLevel, setAgeLevel] = useState('adult_beginner');
  const [error, setError] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [partialOutline, setPartialOutline] = useState(null);
  const abortControllerRef = useRef(null);

  function handleCancel() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setPartialOutline(null);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsStreaming(true);
    setPartialOutline(null);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ prompt, ageLevel }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed to create guide.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'partial') setPartialOutline(evt.outline);
          else if (evt.type === 'done') { navigate(`/guides/${evt.guide.id}`); return; }
          else if (evt.type === 'error') throw new Error(evt.message);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setIsStreaming(false);
    }
  }

  if (isStreaming) {
    return (
      <div className="flex min-h-[60vh] items-start justify-center pt-8">
        <StreamingView
          prompt={prompt}
          partialOutline={partialOutline}
          onCancel={handleCancel}
          error={error}
        />
      </div>
    );
  }

  return (
    <section className="grid gap-8 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New Guide</h1>
        <p className="mt-2 max-w-2xl text-charcoal-400">
          Describe what you want to learn and StructureMyLearning will turn it into a guided outline.
        </p>

        <form className="mt-8 rounded-lg border border-charcoal/10 bg-white p-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Learning goal
            <textarea
              className="mt-2 min-h-36 w-full resize-y rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700"
              placeholder="Teach me about transformer architecture"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
              minLength="5"
              maxLength="500"
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Learner level
            <select
              className="mt-2 w-full rounded-md border border-charcoal/15 px-3 py-2 outline-none focus:border-teal-700"
              value={ageLevel}
              onChange={(event) => setAgeLevel(event.target.value)}
            >
              {ageLevels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button className="mt-5 rounded-md bg-charcoal px-4 py-2.5 font-medium text-white disabled:opacity-60">
            Generate guide
          </button>
        </form>
      </div>

    </section>
  );
}
