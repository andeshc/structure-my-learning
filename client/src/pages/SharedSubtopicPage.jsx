import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getSharedSubtopic, adoptGuide } from '../api/share';

const PURIFY_CONFIG = {
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
  ADD_TAGS: [],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
};

function sanitize(html) {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

function SubtopicStatusPanel({ devStatus }) {
  if (devStatus === 'developing') {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        <div>
          <p className="font-semibold text-slate-800">Writing this lesson…</p>
          <p className="mt-1 text-sm text-slate-500">Content is being generated.</p>
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
          <p className="mt-1 text-sm text-slate-500">The guide owner can retry from their guide page.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Clock className="text-slate-300" size={32} />
      <div>
        <p className="font-semibold text-slate-800">Lesson queued</p>
        <p className="mt-1 text-sm text-slate-500">This lesson is waiting to be generated.</p>
      </div>
    </div>
  );
}

function GateModal({ shareToken, onDismiss }) {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    try {
      const { guideId } = await adoptGuide(shareToken);
      navigate(`/guides/${guideId}`);
    } catch {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-lg font-semibold text-slate-900">You've previewed 2 lessons</p>
        <p className="mt-2 text-sm text-slate-500">
          Add this guide to your library to keep reading, track your progress, and use the AI tutor.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {adding ? 'Adding…' : 'Add to my library →'}
          </button>
          <button
            onClick={onDismiss}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-300"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SharedSubtopicPage() {
  const { shareToken, topicId, position: positionParam } = useParams();
  const position = parseInt(positionParam, 10);
  const navigate = useNavigate();
  const auth = useAuth();

  const [data, setData] = useState(null);
  const [gated, setGated] = useState(false);
  const [error, setError] = useState('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [adding, setAdding] = useState(false);
  const articleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (document.querySelector('script[data-tailwind-cdn]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.setAttribute('data-tailwind-cdn', '');
    document.head.appendChild(script);
  }, []);

  // Redirect to share page if not authenticated
  useEffect(() => {
    if (auth.status !== 'loading' && !auth.isAuthenticated) {
      navigate(`/share/${shareToken}`, { replace: true });
    }
  }, [auth.status, auth.isAuthenticated, shareToken]);

  // Scroll to top on subtopic change
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
    if (!auth.isAuthenticated) return;
    const controller = new AbortController();
    setReadingProgress(0);
    setGated(false);
    setError('');
    setData(null);

    getSharedSubtopic(shareToken, topicId, position)
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.gated) {
          setGated(true);
        } else {
          setData(res);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });

    return () => controller.abort();
  }, [shareToken, topicId, positionParam, auth.isAuthenticated]);

  useEffect(() => {
    if (contentRef.current) {
      Prism.highlightAllUnder(contentRef.current);
    }
  }, [data]);

  useEffect(() => {
    if (!articleRef.current) return;
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

  async function handleAddToLibrary() {
    setAdding(true);
    try {
      const { guideId } = await adoptGuide(shareToken);
      navigate(`/guides/${guideId}`);
    } catch {
      setAdding(false);
    }
  }

  if (auth.status === 'loading') {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!data && !gated) {
    return (
      <>
        <div className="fixed left-0 right-0 top-0 z-[70] h-1 bg-slate-100" />
        <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)] animate-pulse">
          <aside className="hidden xl:flex xl:flex-col gap-4">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="mt-1 space-y-1.5">
                {[75, 90, 60, 80, 55].map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-slate-100" />
                ))}
              </div>
            </div>
          </aside>
          <div>
            <div className="flex flex-col gap-4">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-8 w-3/4 rounded bg-slate-200" />
              <div className="mt-1 h-4 w-full max-w-lg rounded bg-slate-200" />
            </div>
            <div className="mt-6 -mx-5 sm:mx-0 border-y sm:rounded-xl sm:border border-slate-200 bg-white p-6 lg:p-8 space-y-3">
              {[100, 83, 90, 100, 75, null, 100, 83, 66].map((w, i) =>
                w ? <div key={i} className={`h-4 rounded bg-slate-100`} style={{ width: `${w}%` }} /> : <div key={i} className="mt-4 h-36 w-full rounded-lg bg-slate-100" />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (gated) {
    return (
      <GateModal
        shareToken={shareToken}
        onDismiss={() => navigate(`/share/${shareToken}`)}
      />
    );
  }

  const { subtopic, item, sectionItems, prevItem, nextItem, nextTopic, fullOutline, topic, guide } = data;
  const displayedHtml = subtopic?.contentHtml;
  const lessonNumber = position + 1;
  const totalLessons = sectionItems.length;

  function shareSubtopicLink(tId, pos) {
    return `/share/${shareToken}/topics/${tId}/subtopics/${pos}`;
  }

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
              to={`/share/${shareToken}`}
            >
              <ChevronLeft size={15} />
              {guide.title}
            </Link>

            {/* Preview notice + add to library */}
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Shared preview</p>
              <p className="mt-1 text-xs text-teal-800">
                Shared by <span className="font-semibold">{guide.ownerName}</span>
              </p>
              <button
                onClick={handleAddToLibrary}
                disabled={adding}
                className="mt-3 w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {adding ? 'Adding…' : 'Add to my library →'}
              </button>
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
                          to={section.topicId ? shareSubtopicLink(section.topicId, si.position) : '#'}
                          className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isCurrent
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            <Circle className={isCurrent ? 'text-blue-500' : 'text-slate-300'} size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium leading-snug">{si.title}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">
                              {si.hasContent ? 'Ready' : si.devStatus === 'developing'
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
          </div>
        </aside>

        {/* Main content */}
        <div ref={articleRef} className="min-w-0">
          {/* Mobile breadcrumb */}
          <div className="mb-5 flex min-w-0 items-center gap-2 text-sm text-slate-500 xl:hidden">
            <Link className="shrink-0 max-w-[45%] truncate font-medium text-blue-700 hover:underline" to={`/share/${shareToken}`}>
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
              {item.overview && (
                <p className="mt-3 max-w-2xl text-slate-500">{item.overview}</p>
              )}
            </div>
            <button
              onClick={handleAddToLibrary}
              disabled={adding}
              className="self-start shrink-0 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {adding ? 'Adding…' : 'Add to library'}
            </button>
          </div>

          {/* Lesson content */}
          <div className="mt-6 -mx-5 sm:mx-0 border-y sm:rounded-xl sm:border border-slate-200 bg-white p-6 lg:p-8 min-h-[200px]">
            {displayedHtml ? (
              <div
                ref={contentRef}
                className="lesson-content"
                dangerouslySetInnerHTML={{ __html: sanitize(displayedHtml) }}
              />
            ) : (
              <SubtopicStatusPanel devStatus={subtopic?.devStatus} />
            )}
          </div>

          {/* Prev / Next nav */}
          <nav className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6">
            {prevItem ? (
              <Link
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                to={shareSubtopicLink(topicId, prevItem.position)}
              >
                <ChevronLeft size={16} />
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Previous: </span>{prevItem.title}
                </span>
              </Link>
            ) : (
              <Link
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                to={`/share/${shareToken}`}
              >
                <ChevronLeft size={16} />
                Back to guide
              </Link>
            )}
            {nextItem ? (
              <Link
                className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                to={shareSubtopicLink(topicId, nextItem.position)}
              >
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Next: </span>{nextItem.title}
                </span>
                <ChevronRight size={16} />
              </Link>
            ) : nextTopic ? (
              <Link
                className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                to={shareSubtopicLink(nextTopic.id, 0)}
              >
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Next section: </span>{nextTopic.title}
                </span>
                <ChevronRight size={16} />
              </Link>
            ) : null}
          </nav>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
              <path d="M10 1a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1ZM5.05 3.05a.75.75 0 0 1 1.06 0l1.062 1.06A.75.75 0 1 1 6.11 5.173L5.05 4.11a.75.75 0 0 1 0-1.06ZM14.95 3.05a.75.75 0 0 1 0 1.06l-1.06 1.063a.75.75 0 0 1-1.062-1.061l1.061-1.062a.75.75 0 0 1 1.06 0ZM3 9.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3ZM15.5 9.25a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5h-1.5ZM6.172 13.768a.75.75 0 0 0-1.06 1.06l1.06 1.062a.75.75 0 0 0 1.062-1.061l-1.062-1.061ZM14.89 14.828a.75.75 0 0 0-1.061-1.06l-1.062 1.06a.75.75 0 1 0 1.061 1.062l1.062-1.062ZM10 15.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15.5ZM10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            </svg>
            AI-generated content — verify important information independently.
          </p>
        </div>
      </div>
    </>
  );
}
