import { Check, FolderPlus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { addGuideToCollection, listCollections, removeGuideFromCollection } from '../api/collections';
import { listGuideCollections } from '../api/guides';
import CreateCollectionModal from './CreateCollectionModal';

// Modal that lists the user's collections with a toggle for this guide's
// membership, plus a "create new collection" affordance. Self-contained: fetches
// its own data on open. `onChanged` fires after any membership change.
export default function AddToCollectionMenu({ guideId, guideTitle, onClose, onChanged }) {
  const [collections, setCollections] = useState([]);
  const [memberIds, setMemberIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [colRes, memRes] = await Promise.all([
          listCollections(),
          listGuideCollections(guideId),
        ]);
        if (cancelled) return;
        setCollections(colRes.collections || []);
        setMemberIds(new Set(memRes.collectionIds || []));
      } catch {
        // errors surface via toast from the api client
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [guideId]);

  async function toggle(collectionId, isMember) {
    setBusyId(collectionId);
    try {
      if (isMember) {
        await removeGuideFromCollection(collectionId, guideId);
        setMemberIds((prev) => {
          const next = new Set(prev);
          next.delete(collectionId);
          return next;
        });
      } else {
        await addGuideToCollection(collectionId, guideId);
        setMemberIds((prev) => new Set(prev).add(collectionId));
      }
      onChanged?.();
    } catch {
      // toast handled by api client
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreated(collection) {
    setIsCreating(false);
    setCollections((prev) => [...prev, collection]);
    await toggle(collection.id, false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
        <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 p-5 pb-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-teal-700">
              <FolderPlus size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Add to collection</h2>
              <p className="truncate text-xs text-slate-500">{guideTitle}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <p className="px-2 py-4 text-sm text-slate-400">Loading…</p>
            ) : collections.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                You don't have any collections yet. Create one to start grouping guides.
              </p>
            ) : (
              <ul className="grid gap-1">
                {collections.map((c) => {
                  const isMember = memberIds.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-checked={isMember}
                        disabled={busyId === c.id}
                        onClick={() => toggle(c.id, isMember)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-950">{c.name}</span>
                          <span className="block text-xs text-slate-400">
                            {c.guideCount} guide{(c.guideCount || 0) !== 1 ? 's' : ''}
                          </span>
                        </span>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${isMember ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'}`}>
                          {isMember && <Check size={14} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50"
            >
              <Plus size={15} />
              Create new collection
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {isCreating && (
        <CreateCollectionModal onClose={() => setIsCreating(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
