import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getSubtopic, updateSubtopicProgress } from '../api/guides';
import { useToast } from '../context/ToastContext';
import LessonContent from '../components/LessonContent';
import TutorDrawer from '../components/TutorDrawer';

// Average adult reading speed (words/min). We require ~50% of the resulting
// estimate as active dwell time before auto-completing — lenient by design.
const READING_WPM = 265;
const TIME_GATE_FRACTION = 0.5;
const MIN_READ_SECONDS = 8;
const MAX_READ_SECONDS = 90;
const SCROLL_COMPLETE_THRESHOLD = 95;

function countWords(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

// Nearest scrollable ancestor (AppShell scrolls its content div, not the window,
// on lg+). Returns `window` if none is found.
function findScrollContainer(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return window;
}

function SubtopicStatusPanel({ devStatus }) {
  if (devStatus === 'developing') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        <div>
          <p className="font-semibold text-slate-800">Writing this lesson…</p>
          <p className="mt-1 text-sm text-slate-500">The AI is generating content. This page will update automatically.</p>
        </div>
      </div>
    );
  }
  if (devStatus === 'failed') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <AlertTriangle className="text-red-400" size={32} />
        <div>
          <p className="font-semibold text-slate-800">Generation failed</p>
          <p className="mt-1 text-sm text-slate-500">Use "Resume development" on the guide page to retry.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Clock className="text-slate-300" size={32} />
      <div>
        <p className="font-semibold text-slate-800">Lesson queued</p>
        <p className="mt-1 text-sm text-slate-500">This lesson is waiting to be generated. This page will update automatically.</p>
      </div>
    </div>
  );
}

function ImportanceBadge() {
  return null;
}

// --- Main page ---

export default function SubtopicDetailPage() {
  const { topicId, position: positionParam } = useParams();
  const position = parseInt(positionParam, 10);
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [tutorPushed, setTutorPushed] = useState(false);
  const articleRef = useRef(null);
  const autoCompletedRef = useRef(false);

  const requiredSeconds = useMemo(() => {
    const words = countWords(data?.subtopic?.contentHtml);
    const estimate = (words / READING_WPM) * 60 * TIME_GATE_FRACTION;
    return Math.min(MAX_READ_SECONDS, Math.max(MIN_READ_SECONDS, estimate));
  }, [data?.subtopic?.contentHtml]);

  useEffect(() => {
    if (document.querySelector('script[data-tailwind-cdn]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.setAttribute('data-tailwind-cdn', '');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    function getScrollContainer(el) {
      let node = el?.parentElement;
      while (node && node !== document.body) {
        const { overflowY } = window.getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
        node = node.parentElement;
      }
      return window;
    }
    const container = articleRef.current ? getScrollContainer(articleRef.current) : window;
    if (container === window) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      container.scrollTop = 0;
    }
  }, [topicId, positionParam]);

  useEffect(() => {
    const controller = new AbortController();
    setReadingProgress(0);
    setActiveSeconds(0);
    autoCompletedRef.current = false;
    setLoadingContent(true);
    setError('');

    getSubtopic(topicId, position)
      .then((res) => { if (!controller.signal.aborted) { setData(res); setLoadingContent(false); } })
      .catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoadingContent(false); } });

    return () => controller.abort();
  }, [topicId, positionParam]);

  // Poll while content isn't ready yet
  useEffect(() => {
    if (!data || data.subtopic?.contentHtml) return;
    const devStatus = data.subtopic?.devStatus;
    if (devStatus !== 'pending' && devStatus !== 'developing') return;
    const interval = setInterval(() => {
      getSubtopic(topicId, position).then((res) => setData(res)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [data, topicId, position]);

  useEffect(() => {
    if (!articleRef.current) return;
    // AppShell uses overflow-y-auto on the content div (not window) on lg screens
    function getScrollContainer(el) {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const { overflowY } = window.getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
        node = node.parentElement;
      }
      return window;
    }
    const container = getScrollContainer(articleRef.current);
    function onScroll() {
      if (!articleRef.current) return;
      const viewH = container === window ? window.innerHeight : container.clientHeight;
      const total = articleRef.current.offsetHeight - viewH;
      if (total <= 0) { setReadingProgress(100); return; }
      const rect = articleRef.current.getBoundingClientRect();
      const containerTop = container === window ? 0 : container.getBoundingClientRect().top;
      setReadingProgress(Math.min(100, Math.round((Math.max(0, -(rect.top - containerTop)) / total) * 100)));
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [data]);

  async function applyProgress(nextValue) {
    setIsSaving(true);
    try {
      const res = await updateSubtopicProgress(topicId, position, nextValue);
      setData((prev) => ({
        ...prev,
        subtopic: { ...prev.subtopic, isCompleted: res.isCompleted },
        guide: { ...prev.guide, subtopicProgressPercentage: res.guide.subtopicProgressPercentage ?? prev.guide.subtopicProgressPercentage },
        sectionItems: prev.sectionItems.map((si) =>
          si.position === position ? { ...si, isCompleted: res.isCompleted } : si
        ),
      }));
      return res.isCompleted;
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  function toggleComplete() {
    if (!data) return;
    applyProgress(!data.subtopic.isCompleted).catch(() => {});
  }

  // Accumulate active dwell time — only while the tab is visible (Page
  // Visibility API). Runs once content is loaded; reset on subtopic change.
  const contentLoaded = Boolean(data?.subtopic?.contentHtml);
  useEffect(() => {
    if (!contentLoaded) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveSeconds((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [contentLoaded, topicId, positionParam]);

  // Auto-mark complete once the reader has reached the end AND spent enough
  // active time. Fires at most once per subtopic; never un-completes.
  useEffect(() => {
    if (!contentLoaded || autoCompletedRef.current) return;
    if (data?.guide?.readOnly) return;
    if (data?.subtopic?.isCompleted) return;
    if (readingProgress < SCROLL_COMPLETE_THRESHOLD) return;
    if (activeSeconds < requiredSeconds) return;
    autoCompletedRef.current = true;
    applyProgress(true)
      .then((completed) => {
        if (completed) showToast({ type: 'info', message: 'Marked as complete' });
      })
      .catch(() => { autoCompletedRef.current = false; });
  }, [contentLoaded, data?.subtopic?.isCompleted, readingProgress, activeSeconds, requiredSeconds]);

  // When the tutor is docked-open at xl, shrink the scroll container itself (not
  // just the page grid) so its vertical scrollbar stays visible to the LEFT of the
  // drawer rather than hidden behind it. At lg the drawer overlays (scrim), so no
  // reservation is made there.
  useEffect(() => {
    const container = findScrollContainer(articleRef.current);
    if (!container || container === window) return undefined;
    const xl = window.matchMedia('(min-width: 1280px)');
    const apply = () => {
      container.style.transition = 'margin-right 300ms ease-in-out';
      container.style.marginRight = tutorPushed && xl.matches ? '360px' : '';
    };
    apply();
    xl.addEventListener('change', apply);
    return () => {
      xl.removeEventListener('change', apply);
      container.style.marginRight = '';
    };
  }, [tutorPushed, data]);

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return (
      <>
        <div className="fixed left-0 right-0 top-0 z-[70] h-1 bg-slate-100" />
        <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)] animate-pulse">
          {/* Sidebar skeleton — xl only */}
          <aside className="hidden xl:flex xl:flex-col gap-4">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-7 w-16 rounded bg-slate-200" />
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="mt-1 space-y-1.5">
                {[75, 90, 60, 80, 55, 70].map((w, i) => (
                  <div key={i} className="h-8 rounded-lg bg-slate-100" />
                ))}
              </div>
            </div>
          </aside>

          {/* Main content skeleton */}
          <div>
            {/* Mobile breadcrumb */}
            <div className="mb-5 flex items-center gap-2 xl:hidden">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 w-2 rounded bg-slate-200" />
              <div className="h-4 w-32 rounded bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="h-8 w-3/4 rounded bg-slate-200" />
                <div className="h-8 w-1/2 rounded bg-slate-200" />
                <div className="mt-1 h-4 w-full max-w-lg rounded bg-slate-200" />
                <div className="h-4 w-2/3 rounded bg-slate-200" />
              </div>
              <div className="h-10 w-36 shrink-0 rounded-lg bg-slate-200" />
            </div>

            {/* Content card */}
            <div className="mt-6 -mx-5 sm:mx-0 border-y sm:rounded-xl sm:border border-slate-200 bg-white p-6 lg:p-8 space-y-3">
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-5/6 rounded bg-slate-100" />
              <div className="h-4 w-4/5 rounded bg-slate-100" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="mt-4 h-36 w-full rounded-lg bg-slate-100" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-5/6 rounded bg-slate-100" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
            </div>

            {/* Prev / Next nav */}
            <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6">
              <div className="h-10 w-32 rounded-lg bg-slate-200" />
              <div className="ml-auto h-10 w-32 rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>
      </>
    );
  }

  const { subtopic, item, sectionItems, prevItem, nextItem, nextTopic, fullOutline, topic, guide } = data;
  const displayedHtml = subtopic?.contentHtml;
  const lessonNumber = position + 1;
  const totalLessons = sectionItems.length;

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-[70] h-1 bg-slate-100">
        <div className="h-full bg-blue-500 transition-none" style={{ width: `${readingProgress}%` }} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar — xl only */}
        <aside className="hidden xl:flex xl:flex-col">
          <div className="sticky top-8 flex max-h-[calc(100vh-4rem)] flex-col gap-4 overflow-hidden">
            <Link
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700"
              to={`/guides/${guide.id}`}
            >
              <ChevronLeft size={15} />
              {guide.title}
            </Link>

            {/* Guide progress */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Guide progress</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-950">{guide.subtopicProgressPercentage}%</span>
              </div>
              <progress className="mt-2 h-2 w-full overflow-hidden rounded-full" max="100" value={guide.subtopicProgressPercentage}>
                {guide.subtopicProgressPercentage}%
              </progress>
            </div>

            {/* Full guide outline nav */}
            <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">Guide outline</p>
              <nav className="mt-3 flex-1 overflow-y-auto">
                {(fullOutline ?? []).map((section) => (
                  <div key={section.topicId} className="mb-4 last:mb-0">
                    <p className={`mb-1 px-3 text-[11px] font-bold uppercase tracking-wider truncate ${
                      section.topicId === topicId ? 'text-blue-600' : 'text-slate-400'
                    }`}>
                      {section.title}
                    </p>
                    {section.items.map((si) => {
                      const isCurrent = section.topicId === topicId && si.position === position;
                      return (
                        <Link
                          key={`${section.topicId}-${si.position}`}
                          to={`/topics/${section.topicId}/subtopics/${si.position}`}
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
                              {si.isCompleted ? 'Done' : si.hasContent ? 'Ready' : si.devStatus === 'developing' ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" /> : si.devStatus === 'failed' ? 'Failed' : 'Pending'}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div ref={articleRef} className="min-w-0">
          {/* Mobile breadcrumb */}
          <div className="mb-5 flex min-w-0 items-center gap-2 text-sm text-slate-500 xl:hidden">
            <Link className="shrink-0 max-w-[45%] truncate font-medium text-blue-700 hover:underline" to={`/guides/${guide.id}`}>
              {guide.title}
            </Link>
            <span className="shrink-0">/</span>
            <span className="truncate">{topic.title}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Lesson {lessonNumber} of {totalLessons}
              </p>
              <h1 className="mt-1 max-w-3xl text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{item.title}</h1>
              <div className="mt-2 flex items-center gap-2">
                <ImportanceBadge importance={item.importance} />
              </div>
              {item.overview && (
                <p className="mt-3 max-w-2xl text-slate-500">{item.overview}</p>
              )}
            </div>
            {guide.readOnly ? (
              <span className="self-start shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                Read-only · admin view
              </span>
            ) : (
              <button
                className={`self-start shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  subtopic?.isCompleted
                    ? 'border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
                disabled={isSaving}
                onClick={toggleComplete}
              >
                {subtopic?.isCompleted ? 'Mark incomplete' : 'Mark complete'}
              </button>
            )}
          </div>

          {/* Lesson content */}
          <div className="mt-6 -mx-5 sm:mx-0 border-y sm:rounded-xl sm:border border-slate-200 bg-white p-6 lg:p-8 min-h-[200px]">
            {loadingContent ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-5/6 rounded bg-slate-100" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
                <div className="mt-4 h-36 w-full rounded-lg bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-5/6 rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
              </div>
            ) : displayedHtml ? (
              <LessonContent html={displayedHtml} />
            ) : (
              <SubtopicStatusPanel devStatus={subtopic?.devStatus} />
            )}
          </div>

          {/* Prev / Next nav */}
          <nav className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6">
            {prevItem ? (
              <Link
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                to={`/topics/${topicId}/subtopics/${prevItem.position}`}
              >
                <ChevronLeft size={16} />
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Previous: </span>{prevItem.title}
                </span>
              </Link>
            ) : (
              <Link
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                to={`/guides/${guide.id}`}
              >
                <ChevronLeft size={16} />
                Back to guide
              </Link>
            )}
            {nextItem ? (
              <Link
                className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                to={`/topics/${topicId}/subtopics/${nextItem.position}`}
              >
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Next: </span>{nextItem.title}
                </span>
                <ChevronRight size={16} />
              </Link>
            ) : nextTopic ? (
              <Link
                className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                to={`/topics/${nextTopic.id}/subtopics/0`}
              >
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Next section: </span>{nextTopic.title}
                </span>
                <ChevronRight size={16} />
              </Link>
            ) : null}
          </nav>

          {/* AI disclaimer */}
          <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
              <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.063a.75.75 0 0 1-1.062-1.061l1.061-1.062a.75.75 0 0 1 1.06 0ZM3 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3ZM15.5 9.25a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5h-1.5ZM6.172 13.768a.75.75 0 0 0-1.06 1.06l1.06 1.062a.75.75 0 0 0 1.062-1.061l-1.062-1.061ZM14.89 14.828a.75.75 0 0 0-1.061-1.06l-1.062 1.06a.75.75 0 1 0 1.061 1.062l1.062-1.062ZM10 15.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15.5ZM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            </svg>
            AI-generated content — verify important information independently.
          </p>
        </div>
      </div>

      {/* AI Tutor — docked drawer (desktop) / bottom sheet (mobile) */}
      {!guide.readOnly && (
        <TutorDrawer
          key={`${topicId}-${position}`}
          topicId={topicId}
          position={position}
          subtopicTitle={item.title}
          fullOutline={fullOutline}
          onDesktopOpenChange={setTutorPushed}
        />
      )}
    </>
  );
}
