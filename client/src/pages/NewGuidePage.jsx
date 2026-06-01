import { ChevronDown, Layers, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { createGuide } from '../api/guides';

const youngLearners = [
  { value: 'early_learner',   label: 'Early learner',   note: 'Ages 3–5' },
  { value: 'young_child',     label: 'Young child',     note: 'Ages 6–10' },
  { value: 'middle_schooler', label: 'Middle schooler', note: 'Ages 11–13' },
  { value: 'high_schooler',   label: 'High schooler',   note: 'Ages 14–18' },
];

const adultLearners = [
  { value: 'adult_beginner',     label: 'Adult Beginner',     note: 'New to the subject' },
  { value: 'adult_intermediate', label: 'Adult Intermediate', note: 'Some familiarity' },
  { value: 'adult_advanced',     label: 'Adult Advanced',     note: 'Deep expertise' },
];

const allLearningLevels = [...youngLearners, ...adultLearners];

const coverageOptions = [
  { value: 'overview',      label: 'Overview',      note: 'Key concepts only' },
  { value: 'balanced',      label: 'Balanced',      note: 'Core concepts in depth' },
  { value: 'comprehensive', label: 'Comprehensive', note: 'Maximum depth' },
];

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-charcoal/15" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(({ value: v, label, note }, i) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex flex-col items-center px-2 py-2 text-sm font-medium transition-colors ${
            i > 0 ? 'border-l border-charcoal/15' : ''
          } ${value === v ? 'bg-teal-700 text-white' : 'text-charcoal hover:bg-charcoal/5'}`}
        >
          {label}
          {note && <span className={`mt-0.5 text-xs ${value === v ? 'opacity-80' : 'opacity-50'}`}>{note}</span>}
        </button>
      ))}
    </div>
  );
}

function LevelDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const selected = allLearningLevels.find((l) => l.value === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function pick(v) {
    onChange(v);
    setIsOpen(false);
  }

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-charcoal/15 bg-white px-3 py-2.5 text-left transition-colors hover:border-charcoal/30"
      >
        <div>
          <p className="text-sm font-medium text-charcoal">{selected.label}</p>
          <p className="text-xs text-charcoal-400">{selected.note}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-charcoal-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-charcoal/15 bg-white shadow-lg">
          <div className="px-3 pb-1 pt-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-200">Young learners</p>
          </div>
          {youngLearners.map(({ value: v, label, note }) => (
            <button
              key={v}
              type="button"
              onClick={() => pick(v)}
              className={`w-full px-3 py-1.5 text-left transition-colors ${
                value === v ? 'bg-teal-700 text-white' : 'hover:bg-charcoal/5'
              }`}
            >
              <span className="text-sm font-medium">{label}</span>
              <span className={`ml-2 text-xs ${value === v ? 'opacity-75' : 'text-charcoal-400'}`}>{note}</span>
            </button>
          ))}
          <div className="mx-3 my-1 border-t border-charcoal/10" />
          <div className="px-3 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-200">Adults</p>
          </div>
          {adultLearners.map(({ value: v, label, note }) => (
            <button
              key={v}
              type="button"
              onClick={() => pick(v)}
              className={`w-full px-3 py-1.5 text-left transition-colors ${
                value === v ? 'bg-teal-700 text-white' : 'hover:bg-charcoal/5'
              }`}
            >
              <span className="text-sm font-medium">{label}</span>
              <span className={`ml-2 text-xs ${value === v ? 'opacity-75' : 'text-charcoal-400'}`}>{note}</span>
            </button>
          ))}
          <div className="pb-1" />
        </div>
      )}
    </div>
  );
}

export default function NewGuidePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [learningLevel, setLearningLevel] = useState('adult_beginner');
  const [coverage, setCoverage] = useState('balanced');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { guideId } = await createGuide({ prompt, learningLevel, coverage });
      navigate(`/guides/${guideId}`);
    } catch (err) {
      setError(err.message || 'Failed to create guide.');
      setIsSubmitting(false);
    }
  }

  return (
    <section className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">New Guide</h1>
      <p className="mt-2 text-charcoal-400">
        Describe what you want to learn and we'll build a structured guide around it.
      </p>

      <form className="mt-6" onSubmit={handleSubmit}>
        {/* Primary input */}
        <div className="rounded-lg border border-charcoal/10 bg-white p-4">
          <label className="block text-sm font-semibold text-charcoal" htmlFor="prompt">
            What do you want to learn?
          </label>
          <p className="mt-0.5 text-xs text-charcoal-400">Be as specific or as broad as you like.</p>
          <textarea
            id="prompt"
            className="mt-3 min-h-20 w-full resize-y rounded-md border border-charcoal/15 px-3 py-2 text-sm outline-none focus:border-teal-700"
            placeholder="e.g. Teach me about transformer architecture"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            minLength="5"
            maxLength="500"
          />
        </div>

        {/* Configuration */}
        <div className="mt-2 rounded-lg border border-charcoal/10 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-charcoal-200">Customise</p>

          {/* Learning level */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-charcoal-400" />
              <p className="text-sm font-medium text-charcoal">Learning level</p>
            </div>
            <p className="mt-0.5 text-xs text-charcoal-400">Who is this guide for?</p>
            <LevelDropdown value={learningLevel} onChange={setLearningLevel} />
          </div>

          {/* Coverage */}
          <div className="mt-8">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-charcoal-400" />
              <p className="text-sm font-medium text-charcoal">Coverage</p>
            </div>
            <p className="mt-0.5 text-xs text-charcoal-400">How deep should the guide go?</p>
            <div className="mt-2">
              <SegmentedControl options={coverageOptions} value={coverage} onChange={setCoverage} />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          disabled={isSubmitting}
          className="mt-2 w-full rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Generate guide'}
        </button>
      </form>
    </section>
  );
}
