import { ArrowLeft, BookOpen, FolderOpen, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  deleteCollection,
  getCollection,
  removeGuideFromCollection,
  reorderCollectionGuides,
  updateCollection,
} from '../api/collections';
import AddGuidesPicker from '../components/AddGuidesPicker';
import GuideCard from '../components/GuideCard';
import LoadingPanel from '../components/LoadingPanel';
import { useToast } from '../context/ToastContext';

export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [collection, setCollection] = useState(null);
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [dragGuideIndex, setDragGuideIndex] = useState(null);
  const [dragOverGuideIndex, setDragOverGuideIndex] = useState(null);

  async function loadCollection() {
    try {
      const data = await getCollection(collectionId);
      setCollection(data.collection);
      setGuides(data.guides || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  function startEdit() {
    setEditName(collection.name);
    setEditDescription(collection.description || '');
    setIsEditing(true);
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editName.trim()) return;
    setIsSavingEdit(true);
    try {
      const { collection: updated } = await updateCollection(collectionId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setCollection(updated);
      setIsEditing(false);
      showToast({ type: 'info', message: 'Collection updated.' });
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleRemoveGuide(guide) {
    try {
      await removeGuideFromCollection(collectionId, guide.id);
      setGuides((current) => current.filter((g) => g.id !== guide.id));
      setCollection((c) => ({ ...c, guideCount: Math.max(0, (c.guideCount || 0) - 1) }));
      showToast({ type: 'info', message: 'Removed from collection.' });
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  }

  async function handleDelete() {
    try {
      await deleteCollection(collectionId);
      showToast({ type: 'info', message: 'Collection deleted.' });
      navigate('/dashboard');
    } catch (err) {
      showToast({ type: 'error', message: err.message });
      setDeleteConfirm(false);
    }
  }

  function handleAdded(newGuideIds) {
    setIsPickerOpen(false);
    loadCollection();
  }

  function handleGuideDrop(targetIndex) {
    if (dragGuideIndex === null || dragGuideIndex === targetIndex) {
      setDragGuideIndex(null);
      setDragOverGuideIndex(null);
      return;
    }
    const reordered = [...guides];
    const [moved] = reordered.splice(dragGuideIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setGuides(reordered);
    setDragGuideIndex(null);
    setDragOverGuideIndex(null);
    reorderCollectionGuides(collectionId, reordered.map((g) => g.id)).catch(() => loadCollection());
  }

  if (isLoading) {
    return <LoadingPanel title="Loading collection" detail="Fetching this collection and its guides." />;
  }

  if (error || !collection) {
    return (
      <section>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error || 'Collection not found.'}
        </p>
      </section>
    );
  }

  const pct = collection.progressPct || 0;

  return (
    <section>
      {/* Full-bleed branded header */}
      <div className="relative -mx-5 -mt-7 mb-8 overflow-hidden sm:-mx-8 sm:-mt-7 lg:-mx-16 lg:-mt-12">
        {/* Fine-line teal grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(15,118,110,0.10) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(15,118,110,0.10) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '40px 40px',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          }}
        />
        {/* Color blooms */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              'radial-gradient(ellipse 60% 120% at 0% 0%, rgba(99,102,241,0.10) 0%, transparent 60%)',
              'radial-gradient(ellipse 60% 120% at 50% 0%, rgba(15,118,110,0.09) 0%, transparent 60%)',
              'radial-gradient(ellipse 40% 80% at 100% 0%, rgba(251,146,60,0.07) 0%, transparent 55%)',
            ].join(', '),
          }}
        />
        <div className="relative px-5 py-8 sm:px-8 lg:px-16">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
            <ArrowLeft size={16} /> Back to dashboard
          </Link>

          {isEditing ? (
            <form onSubmit={saveEdit} className="grid gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                className="rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Description (optional)"
                className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={isSavingEdit} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
                  {isSavingEdit ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
                  <X size={14} /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-slate-950">{collection.name}</h1>
                  {collection.description && (
                    <p className="mt-1 text-sm text-slate-600">{collection.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold hover:border-teal-200 hover:text-teal-700">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-red-700 hover:border-red-200 hover:bg-red-50">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="shrink-0 text-sm font-medium text-slate-500">
                  {collection.guideCount} guide{(collection.guideCount || 0) !== 1 ? 's' : ''}
                </span>
                <progress className="h-1.5 w-48 overflow-hidden rounded-full" max="100" value={pct}>
                  {pct}%
                </progress>
                <span className="text-sm font-semibold text-slate-950">{pct}%</span>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <Plus size={16} /> Add guides
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Member guides */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="h-5 w-0.5 rounded-full bg-teal-700" />
          <BookOpen className="text-teal-700" size={20} />
          <h2 className="text-lg font-bold">Guides in this collection</h2>
        </div>

        {guides.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">This collection is empty.</p>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              <Plus size={16} /> Add your first guide
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(260px,340px))] sm:justify-start">
            {guides.map((guide, index) => (
              <div
                key={guide.id}
                draggable
                onDragStart={() => setDragGuideIndex(index)}
                onDragEnter={() => setDragOverGuideIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleGuideDrop(index)}
                onDragEnd={() => { setDragGuideIndex(null); setDragOverGuideIndex(null); }}
                className={`group relative cursor-grab active:cursor-grabbing ${dragGuideIndex === index ? 'opacity-40' : ''} ${dragOverGuideIndex === index && dragGuideIndex !== index ? 'rounded-xl ring-2 ring-teal-400' : ''}`}
              >
                <div className="pointer-events-none absolute left-2 top-2 z-10 hidden items-center justify-center rounded-md bg-white/85 p-1 text-slate-400 shadow-sm group-hover:flex">
                  <GripVertical size={14} />
                </div>
                <GuideCard
                  guide={guide}
                  index={index}
                  onDelete={handleRemoveGuide}
                  extraMenu={[
                    {
                      label: 'Remove from collection',
                      icon: <FolderOpen size={14} />,
                      onSelect: () => handleRemoveGuide(guide),
                      destructive: true,
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {isPickerOpen && (
        <AddGuidesPicker
          collectionId={collectionId}
          existingGuideIds={guides.map((g) => g.id)}
          onClose={() => setIsPickerOpen(false)}
          onAdded={handleAdded}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
                <Trash2 size={24} />
              </span>
              <div>
                <h2 className="text-xl font-bold">Delete collection?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will delete &ldquo;{collection.name}&rdquo;. Your guides will not be deleted — they will still be available on your dashboard.
                </p>
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
