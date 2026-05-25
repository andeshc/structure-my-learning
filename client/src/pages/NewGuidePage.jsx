import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createGuide } from '../api/guides';

const ageLevels = [
  ['ages_8_10', 'Ages 8-10'],
  ['ages_11_13', 'Ages 11-13'],
  ['ages_14_17', 'Ages 14-17'],
  ['adult_beginner', 'Adult beginner'],
  ['adult_advanced', 'Adult advanced'],
];

export default function NewGuidePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [ageLevel, setAgeLevel] = useState('adult_beginner');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { guideId } = await createGuide({ prompt, ageLevel });
      navigate(`/guides/${guideId}`);
    } catch (err) {
      setError(err.message || 'Failed to create guide.');
      setIsSubmitting(false);
    }
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">New Guide</h1>
      <p className="mt-2 text-charcoal-400">
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

        <button
          disabled={isSubmitting}
          className="mt-5 rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Generate guide'}
        </button>
      </form>
    </section>
  );
}
