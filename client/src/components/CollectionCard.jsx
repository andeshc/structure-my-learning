import { FolderOpen } from 'lucide-react';
import { Link } from 'react-router';
import { CARD_THEMES } from './GuideCard';

// Horizontal-strip collection card for the dashboard.
export default function CollectionCard({ collection, index = 0 }) {
  const theme = CARD_THEMES[index % CARD_THEMES.length];
  const pct = collection.progressPct || 0;
  const count = collection.guideCount || 0;
  const previews = collection.previewUrls || [];

  return (
    <Link
      to={`/collections/${collection.id}`}
      className="group flex h-full w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-teal-200 hover:shadow-[0_0_0_3px_rgba(15,118,110,0.07)]"
      style={{ backgroundColor: theme.cardBg }}
    >
      <div className="relative h-20 overflow-hidden border-b border-slate-100">
        {previews.length > 0 ? (
          <>
            <div className="flex h-full divide-x divide-white/40">
              {previews.map((url, i) => (
                <div key={i} className="flex-1 overflow-hidden">
                  <img src={url} className="h-full w-full object-cover" alt="" />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0" style={{ background: theme.overlay }} />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0" style={{ background: theme.overlay }} />
            <div className="flex h-full items-center justify-center">
              <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white/80 text-teal-700">
                <FolderOpen size={20} />
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-slate-950 transition-colors group-hover:text-teal-700">
          {collection.name}
        </h3>
        {collection.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{collection.description}</p>
        )}

        <div className="mt-auto pt-3">
          <p className="text-[11px] font-medium text-slate-400">
            {count} guide{count !== 1 ? 's' : ''}
          </p>
          <div className="mt-1.5 grid grid-cols-[1fr_auto] items-center gap-2">
            <progress className="h-1 w-full overflow-hidden rounded-full" max="100" value={pct}>
              {pct}%
            </progress>
            <span className="text-xs font-semibold text-slate-950">{pct}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
