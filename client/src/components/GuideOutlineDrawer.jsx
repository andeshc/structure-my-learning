import { CheckCircle2, ChevronLeft, Circle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import LogoMark from './LogoMark';
import { lessonBadge } from '../utils/lessonStatus';

// Matches the brand gradient used by the AI Tutor FAB (TutorDrawer.jsx) so the
// two mobile FABs read as a matched pair.
const BRAND_GRADIENT = 'linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #2DD4BF 100%)';

/**
 * Guide outline surfaced as a FAB + bottom sheet below the xl breakpoint,
 * where the docked sidebar outline (rendered by the page itself) is hidden.
 * Takes over the FAB position/icon that used to open the AI Tutor.
 */
export default function GuideOutlineDrawer({ guide, guideHref, topicId, position, fullOutline, buildSubtopicHref }) {
  const [open, setOpen] = useState(false);
  const flatItems = (fullOutline ?? []).flatMap((section) => section.items);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <>
      {!open && (
        <button
          aria-label="Show guide outline"
          className="fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-105 xl:hidden"
          style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))', background: BRAND_GRADIENT }}
          onClick={() => setOpen(true)}
        >
          <LogoMark className="h-6 w-auto" fill="white" />
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/40 xl:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[60] flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl xl:hidden">
            <div className="h-[3px] w-full shrink-0" style={{ background: BRAND_GRADIENT }} />

            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-950">Guide outline</p>
              <button
                aria-label="Close guide outline"
                className="rounded-md p-1 text-slate-400 hover:text-teal-700"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="shrink-0 px-4 pt-3">
              <Link
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700"
                to={guideHref}
                onClick={() => setOpen(false)}
              >
                <ChevronLeft size={15} />
                {guide.title}
              </Link>
              {guide.subtopicProgressPercentage != null && (
                <div className="mt-3 flex items-center gap-3">
                  <progress
                    className="h-2 w-full overflow-hidden rounded-full"
                    max="100"
                    value={guide.subtopicProgressPercentage}
                  >
                    {guide.subtopicProgressPercentage}%
                  </progress>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {guide.subtopicProgressPercentage}%
                  </span>
                </div>
              )}
            </div>

            <nav className="mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {(fullOutline ?? []).map((section) => (
                <div key={section.topicId} className="mb-4 last:mb-0">
                  <p className={`mb-1 px-3 text-[11px] font-bold uppercase tracking-wider truncate ${
                    section.topicId === topicId ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {section.title}
                  </p>
                  {section.items.map((si) => {
                    const isCurrent = section.topicId === topicId && si.position === position;
                    const badge = lessonBadge(flatItems, si);
                    return (
                      <Link
                        key={`${section.topicId}-${si.position}`}
                        to={buildSubtopicHref(section.topicId, si.position)}
                        onClick={() => setOpen(false)}
                        className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          {si.isCompleted ? (
                            <CheckCircle2 className="text-emerald-500" size={15} />
                          ) : (
                            <Circle className={isCurrent ? 'text-blue-500' : 'text-slate-300'} size={15} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium leading-snug">{si.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {badge === 'completed'
                              ? 'Done'
                              : badge === 'in-progress'
                                ? 'In Progress'
                                : badge === 'next-up'
                                  ? 'Next Up'
                                  : si.hasContent
                                    ? 'Ready'
                                    : si.devStatus === 'developing'
                                      ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                                      : si.devStatus === 'failed' ? 'Failed' : 'Pending'}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
