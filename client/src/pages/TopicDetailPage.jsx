import DOMPurify from 'dompurify';
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Lightbulb,
  Send,
  X,
} from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getTopic, updateTopicProgress } from '../api/guides';
import { getAccessToken } from '../api/client';
import LoadingPanel from '../components/LoadingPanel';

const PURIFY_CONFIG = {
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
  ADD_TAGS: [],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

function sanitize(html) {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

// --- AI Tutor widget ---

function AiTutorWidget({ topicId, topicTitle, onClose }) {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/topics/${topicId}/chat`,
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    }),
  });
  const isLoading = status === 'streaming' || status === 'submitted';
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className="flex flex-col rounded-xl border border-amber-200 bg-[#fffaf0]">
      <div className="flex items-center justify-between border-b border-amber-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="shrink-0 text-amber-600" size={18} />
          <div>
            <p className="text-sm font-bold text-slate-950">AI Tutor</p>
            <p className="text-xs text-slate-500 truncate max-w-[160px]">Ask about {topicTitle}</p>
          </div>
        </div>
        {onClose && (
          <button aria-label="Close AI tutor" className="rounded-md p-1 text-slate-400 hover:text-slate-700" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {(messages.length > 0 || isLoading) && (
        <div className="max-h-52 overflow-y-auto space-y-2 p-3">
          {messages.map((msg) => {
            const text = msg.parts?.find((p) => p.type === 'text')?.text ?? '';
            return (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-6 bg-blue-50 text-blue-900'
                    : 'mr-6 border border-slate-100 bg-white text-slate-700'
                }`}
              >
                {text}
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="mr-6 animate-pulse rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-400">
              Thinking…
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form className="flex items-center gap-2 p-3 pt-2" onSubmit={handleSubmit}>
        <input
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          aria-label="Send message"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          disabled={!input.trim() || isLoading}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// --- Main page ---

export default function TopicDetailPage() {
  const { topicId } = useParams();
  const [guide, setGuide] = useState(null);
  const [topic, setTopic] = useState(null);
  const [allTopics, setAllTopics] = useState([]);
  const [prevTopic, setPrevTopic] = useState(null);
  const [nextTopic, setNextTopic] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showMobileAi, setShowMobileAi] = useState(false);
  const [streamedHtml, setStreamedHtml] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const articleRef = useRef(null);

  // Inject Tailwind CDN once so AI-generated HTML classes are available at runtime
  useEffect(() => {
    if (document.querySelector('script[data-tailwind-cdn]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.setAttribute('data-tailwind-cdn', '');
    document.head.appendChild(script);
  }, []);

  async function streamContent(id, signal) {
    setIsStreaming(true);
    setStreamedHtml('');
    try {
      const res = await fetch(`/api/topics/${id}/content`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        signal,
      });
      if (!res.ok) throw new Error('Failed to load topic content.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let html = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        setStreamedHtml(html);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      setIsStreaming(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setReadingProgress(0);
    setGuide(null);
    setTopic(null);
    setStreamedHtml(null);
    setIsStreaming(false);
    getTopic(topicId)
      .then((data) => {
        if (controller.signal.aborted) return;
        setGuide(data.guide);
        setTopic(data.topic);
        setAllTopics(data.allTopics || []);
        setPrevTopic(data.prevTopic || null);
        setNextTopic(data.nextTopic || null);
        if (!data.topic.contentHtml) {
          streamContent(data.topic.id, controller.signal);
        }
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      });
    return () => controller.abort();
  }, [topicId]);

  useEffect(() => {
    function onScroll() {
      if (!articleRef.current) return;
      const rect = articleRef.current.getBoundingClientRect();
      const total = articleRef.current.offsetHeight - window.innerHeight;
      if (total <= 0) { setReadingProgress(100); return; }
      setReadingProgress(Math.min(100, Math.round((Math.max(0, -rect.top) / total) * 100)));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [topic]);

  async function toggleProgress() {
    setIsSaving(true);
    try {
      const data = await updateTopicProgress(topic.id, !topic.isCompleted);
      setTopic((current) => ({
        ...current,
        isCompleted: data.topic.isCompleted,
        completedAt: data.topic.completedAt,
      }));
      setAllTopics((current) =>
        current.map((t) => t.id === topic.id ? { ...t, isCompleted: data.topic.isCompleted } : t)
      );
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!topic || !guide) {
    return <LoadingPanel title="Loading topic" detail="Fetching topic details…" />;
  }

  const displayedHtml = topic.contentHtml ?? streamedHtml;

  const completedCount = allTopics.filter((t) => t.isCompleted).length;
  const guideProgress = allTopics.length > 0 ? Math.round((completedCount / allTopics.length) * 100) : 0;

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-[70] h-1 bg-slate-100">
        <div
          className="h-full bg-blue-500 transition-none"
          style={{ width: `${readingProgress}%` }}
        />
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
                <span className="text-2xl font-bold text-slate-950">{guideProgress}%</span>
                <span className="text-sm text-slate-500">{completedCount} of {allTopics.length} done</span>
              </div>
              <progress className="mt-2 h-2 w-full overflow-hidden rounded-full" max="100" value={guideProgress}>
                {guideProgress}%
              </progress>
            </div>

            {/* Topic list */}
            <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">Topics</p>
              <nav className="mt-3 flex-1 overflow-y-auto">
                {allTopics.map((t) => {
                  const isCurrent = t.id === topic.id;
                  return (
                    <Link
                      key={t.id}
                      to={`/topics/${t.id}`}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {t.isCompleted ? (
                          <CheckCircle2 className="text-emerald-500" size={15} />
                        ) : (
                          <Circle className={isCurrent ? 'text-blue-500' : 'text-slate-300'} size={15} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium leading-snug">{t.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {t.isCompleted ? 'Done' : t.hasContent ? 'In progress' : 'Not started'}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* AI Tutor */}
            <AiTutorWidget key={topicId} topicId={topic.id} topicTitle={topic.title} />
          </div>
        </aside>

        {/* Main content */}
        <div ref={articleRef}>
          {/* Mobile breadcrumb */}
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-500 xl:hidden">
            <Link className="font-medium text-blue-700 hover:underline" to={`/guides/${guide.id}`}>
              {guide.title}
            </Link>
            <span>/</span>
            <span>Topic {topic.position}{allTopics.length > 0 ? ` of ${allTopics.length}` : ''}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 xl:block">
                Topic {topic.position}{allTopics.length > 0 ? ` of ${allTopics.length}` : ''}
              </p>
              <h1 className="mt-1 max-w-3xl text-3xl font-bold leading-tight text-slate-950">{topic.title}</h1>
              <p className="mt-3 max-w-2xl text-slate-500">{topic.description}</p>
            </div>
            <button
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                topic.isCompleted
                  ? 'border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              disabled={isSaving}
              onClick={toggleProgress}
            >
              {topic.isCompleted ? 'Mark incomplete' : 'Mark complete'}
            </button>
          </div>

          {/* Streaming progress bar */}
          {isStreaming && (
            <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/3 animate-pulse bg-blue-400" />
            </div>
          )}

          {/* Lesson content */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 lg:p-8 min-h-[200px]">
            {displayedHtml ? (
              <div
                className="lesson-content"
                dangerouslySetInnerHTML={{ __html: sanitize(displayedHtml) }}
              />
            ) : !isStreaming ? (
              <p className="text-slate-400 text-sm">No content available.</p>
            ) : (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-3/4 rounded-full bg-slate-200" />
                <div className="h-4 w-full rounded-full bg-slate-200" />
                <div className="h-4 w-5/6 rounded-full bg-slate-200" />
              </div>
            )}
          </div>

          {/* Key takeaway callout */}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Lightbulb className="mt-0.5 shrink-0 text-amber-600" size={16} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Key takeaway</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{topic.description}</p>
            </div>
          </div>

          {/* Prev / Next nav */}
          <nav className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6">
            {prevTopic ? (
              <Link
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                to={`/topics/${prevTopic.id}`}
              >
                <ChevronLeft size={16} />
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Previous: </span>{prevTopic.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {nextTopic && (
              <Link
                className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                to={`/topics/${nextTopic.id}`}
              >
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Next: </span>{nextTopic.title}
                </span>
                <ChevronRight size={16} />
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile AI tutor FAB */}
      <button
        aria-label="Open AI tutor"
        className="fixed bottom-6 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-amber-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-amber-600 xl:hidden"
        onClick={() => setShowMobileAi(true)}
      >
        <Bot size={24} />
      </button>

      {/* Mobile AI tutor panel */}
      {showMobileAi && (
        <div className="fixed inset-x-0 bottom-0 z-[60] xl:hidden">
          <div className="rounded-t-2xl bg-white shadow-2xl">
            <AiTutorWidget
              key={topicId}
              topicId={topic.id}
              topicTitle={topic.title}
              onClose={() => setShowMobileAi(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
