import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createGuide } from '../api/guides';
import { LoadingPanel } from '../components/LoadingPanel';
import { useToast } from '../context/ToastContext';

export function NewGuidePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await createGuide(prompt);
      showToast('Guide outline created.');
      navigate(`/guides/${data.guide.id}`);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingPanel title="Building your outline" detail="Creating a 5-12 topic learning progression and saving it." />;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-6 shadow-soft sm:p-8">
      <p className="text-sm font-black uppercase text-primary">New guide</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">What do you want to learn?</h1>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-8 min-h-40 w-full rounded-lg border-2 border-primary bg-white p-5 text-xl outline-none"
        placeholder="teach me SQL joins with examples"
        required
      />
      {error && <p className="mt-4 rounded-lg bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      <button className="mt-5 h-12 rounded-lg bg-primary px-6 font-black text-white shadow-soft">Generate outline</button>
    </form>
  );
}
