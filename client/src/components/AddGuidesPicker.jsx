import { Check, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addGuideToCollection } from '../api/collections';
import { listGuides } from '../api/guides';
import { displayGuideTitle } from './GuideCard';

// Modal that lists guides in the user's library that are not yet in the collection,
// letting the user select and add several at once.
export default function AddGuidesPicker({ collectionId, existingGuideIds, onClose, onAdded }) {
  const [allGuides, setAllGuides] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await listGuides();
        if (cancelled) return;
        setAllGuides(res.guides || []);
      } catch {
        // toast handled by api client
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const existing = new Set(existingGuideIds);
  const available = allGuides.filter((g) => !existing.has(g.id));

  function toggle(guideId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guideId)) next.delete(guideId);
      else next.add(guideId);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const guideIds = [...selected];
      const results = await Promise.allSettled(
        guideIds.map((guideId) => addGuideToCollection(collectionId, guideId))
      );
      const added = guideIds.filter((_, i) => results[i].status === 'fulfilled');
      const failCount = results.filter((r) => r.status === 'rejected').length;
      if (failCount > 0) {
        setError(`${failCount} guide${failCount !== 1 ? 's' : ''} could not be added.`);
      }
      if (added.length > 0) onAdded(added);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-6 pb-4">
          <h2 className="text-xl font-bold">Add guides</h2>
          <p className="mt-1 text-sm text-slate-500">Pick from your library to add to this collection.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="px-2 py-4 text-sm text-slate-400">Loading your library…</p>
          ) : available.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">
              All your guides are already in this collection.
            </p>
          ) : (
            <ul className="grid gap-1">
              {available.map((g) => {
                const isSel = selected.has(g.id);
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => toggle(g.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${isSel ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'}`}>
                        {isSel && <Check size={14} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-950">
                          {displayGuideTitle(g.title)}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {g.topicCount || 0} topic{(g.topicCount || 0) !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && <p className="px-6 text-sm font-semibold text-red-700">{error}</p>}

        <div className="flex items-center justify-between border-t border-slate-100 p-4">
          <span className="text-sm font-medium text-slate-500">
            {selected.size > 0 ? `${selected.size} selected` : ''}
          </span>
          <div className="flex gap-3">
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || selected.size === 0}
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              <Plus size={15} />
              {isSubmitting ? 'Adding…' : `Add ${selected.size > 0 ? selected.size : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
