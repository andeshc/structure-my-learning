import DOMPurify from 'dompurify';
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Send,
  X,
} from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getSubtopic, updateSubtopicProgress } from '../api/guides';
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

// --- Agent activity feed ---

const EVENT_ICONS = {
  agent_status: '◆',
  agent_tool_call: '⟳',
  agent_tool_result: '✓',
};

function buildRows(groupEvents) {
  // Pair each tool_call with its corresponding tool_result (by order of appearance).
  // Status events render individually; paired tool rows collapse into one row.
  const rows = [];
  const calls = groupEvents.filter((e) => e.event.type === 'agent_tool_call');
  const results = groupEvents.filter((e) => e.event.type === 'agent_tool_result');

  for (const { event, globalIdx } of groupEvents) {
    if (event.type === 'agent_status') {
      rows.push({ kind: 'status', event, globalIdx });
    } else if (event.type === 'agent_tool_call') {
      const callIdx = calls.findIndex((c) => c.globalIdx === globalIdx);
      const result = results[callIdx] ?? null;
      rows.push({ kind: 'tool', call: event, result: result?.event ?? null, globalIdx: result?.globalIdx ?? globalIdx });
    }
    // tool_results are consumed by their paired call row — skip standalone
  }
  return rows;
}

function AgentActivityFeed({ events, isStreaming }) {
  // Group events into phases on each agent_status boundary
  const groups = [];
  let current = null;
  events.forEach((event, i) => {
    if (event.type === 'agent_status') {
      if (current) groups.push(current);
      const label = event.message.toLowerCase().includes('writing') ? 'Writing' : 'Planning';
      current = { label, events: [{ event, globalIdx: i }] };
    } else if (current) {
      current.events.push({ event, globalIdx: i });
    }
  });
  if (current) groups.push(current);

  const progress = Math.min(90, Math.round((events.length / 6) * 90));

  if (events.length === 0) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2.5 text-sm text-slate-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-400" />
          Preparing lesson…
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <style>{`@keyframes eventIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }`}</style>

      {/* Overall progress bar */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
          <span>Generating lesson</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase groups */}
      <div className="space-y-4">
        {groups.map((group, gi) => {
          const rows = buildRows(group.events);
          return (
          <div key={gi}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
              {group.label}
            </p>
            <div className="space-y-1.5">
              {rows.map((row, ri) => {
                const isLast = row.globalIdx === events.length - 1;
                const isDone = row.kind === 'tool' ? Boolean(row.result) : !isLast;
                const isPending = isStreaming && !isDone && isLast;
                const displayEvent = row.kind === 'tool' && row.result ? row.result : row.kind === 'tool' ? row.call : row.event;
                return (
                  <div
                    key={ri}
                    className={`flex items-center gap-3 text-sm transition-opacity ${isPending ? '' : 'opacity-40'}`}
                    style={{ animation: 'eventIn 0.2s ease forwards' }}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isPending
                        ? 'bg-blue-100 text-blue-500'
                        : (row.kind === 'tool' && row.result) || row.kind === 'status'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isPending
                        ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                        : EVENT_ICONS[displayEvent.type] ?? '·'
                      }
                    </span>
                    <span className={isPending ? 'font-medium text-slate-800' : 'text-slate-500'}>
                      {displayEvent.message}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// --- AI Tutor widget ---

function AiTutorWidget({ topicId, subtopicTitle, onClose }) {
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
            <p className="text-xs text-slate-500 truncate max-w-[160px]">Ask about {subtopicTitle}</p>
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

function ImportanceBadge({ importance }) {
  if (importance === 'Required') {
    return <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Required</span>;
  }
  if (importance === 'Optional and can be skipped') {
    return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Optional</span>;
  }
  return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Recommended</span>;
}

// --- Main page ---

export default function SubtopicDetailPage() {
  const { topicId, position: positionParam } = useParams();
  const position = parseInt(positionParam, 10);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showMobileAi, setShowMobileAi] = useState(false);
  const [streamedHtml, setStreamedHtml] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentEvents, setAgentEvents] = useState([]);
  const articleRef = useRef(null);

  useEffect(() => {
    if (document.querySelector('script[data-tailwind-cdn]')) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.setAttribute('data-tailwind-cdn', '');
    document.head.appendChild(script);
  }, []);

  async function streamContent(signal) {
    setIsStreaming(true);
    setStreamedHtml('');
    setAgentEvents([]);
    try {
      const res = await fetch(`/api/topics/${topicId}/subtopics/${position}/content`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        signal,
      });
      if (!res.ok) throw new Error('Failed to load subtopic content.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let html = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === 'agent_status' || event.type === 'agent_tool_call' || event.type === 'agent_tool_result') {
            setAgentEvents((prev) => [...prev, event]);
          } else if (event.type === 'content_chunk') {
            html += event.text;
            setStreamedHtml(html);
          } else if (event.type === 'error') {
            setError(event.message);
          }
        }
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
    setData(null);
    setStreamedHtml(null);
    setIsStreaming(false);
    setAgentEvents([]);

    getSubtopic(topicId, position)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
        if (!res.subtopic?.contentHtml) {
          streamContent(controller.signal);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });

    return () => controller.abort();
  }, [topicId, positionParam]);

  useEffect(() => {
    function onScroll() {
      if (!articleRef.current) return;
      const total = articleRef.current.offsetHeight - window.innerHeight;
      if (total <= 0) { setReadingProgress(100); return; }
      const rect = articleRef.current.getBoundingClientRect();
      setReadingProgress(Math.min(100, Math.round((Math.max(0, -rect.top) / total) * 100)));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [data]);

  async function toggleComplete() {
    if (!data) return;
    setIsSaving(true);
    try {
      const res = await updateSubtopicProgress(topicId, position, !data.subtopic.isCompleted);
      setData((prev) => ({
        ...prev,
        subtopic: { ...prev.subtopic, isCompleted: res.isCompleted },
        guide: { ...prev.guide, progressPercentage: res.guide.progressPercentage },
        sectionItems: prev.sectionItems.map((si) =>
          si.position === position ? { ...si, isCompleted: res.isCompleted } : si
        ),
      }));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return <LoadingPanel title="Loading lesson" detail="Fetching subtopic details…" />;
  }

  const { subtopic, item, sectionItems, prevItem, nextItem, topic, guide } = data;
  const displayedHtml = subtopic?.contentHtml ?? streamedHtml;
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
                <span className="text-2xl font-bold text-slate-950">{guide.progressPercentage}%</span>
              </div>
              <progress className="mt-2 h-2 w-full overflow-hidden rounded-full" max="100" value={guide.progressPercentage}>
                {guide.progressPercentage}%
              </progress>
            </div>

            {/* Section subtopics list */}
            <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
              <p className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">Section</p>
              <p className="mt-1 shrink-0 text-sm font-semibold text-slate-800 leading-snug">{topic.title}</p>
              <nav className="mt-3 flex-1 overflow-y-auto">
                {sectionItems.map((si) => {
                  const isCurrent = si.position === position;
                  return (
                    <Link
                      key={si.position}
                      to={`/topics/${topicId}/subtopics/${si.position}`}
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
                          {si.isCompleted ? 'Done' : si.hasContent ? 'Generated' : 'Not started'}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* AI Tutor */}
            <AiTutorWidget key={`${topicId}-${position}`} topicId={topicId} subtopicTitle={item.title} />
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
            <span className="truncate">{topic.title}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Lesson {lessonNumber} of {totalLessons}
              </p>
              <h1 className="mt-1 max-w-3xl text-3xl font-bold leading-tight text-slate-950">{item.title}</h1>
              <div className="mt-2 flex items-center gap-2">
                <ImportanceBadge importance={item.importance} />
              </div>
              {item.overview && (
                <p className="mt-3 max-w-2xl text-slate-500">{item.overview}</p>
              )}
            </div>
            <button
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                subtopic?.isCompleted
                  ? 'border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              disabled={isSaving}
              onClick={toggleComplete}
            >
              {subtopic?.isCompleted ? 'Mark incomplete' : 'Mark complete'}
            </button>
          </div>

          {/* Lesson content */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 lg:p-8 min-h-[200px]">
            {displayedHtml ? (
              <div
                className="lesson-content"
                dangerouslySetInnerHTML={{ __html: sanitize(displayedHtml) }}
              />
            ) : isStreaming ? (
              <AgentActivityFeed events={agentEvents} isStreaming={isStreaming} />
            ) : (
              <p className="text-slate-400 text-sm">No content available.</p>
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
            {nextItem && (
              <Link
                className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                to={`/topics/${topicId}/subtopics/${nextItem.position}`}
              >
                <span className="line-clamp-1 max-w-[140px] sm:max-w-xs">
                  <span className="hidden sm:inline">Next: </span>{nextItem.title}
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
              key={`${topicId}-${position}-mobile`}
              topicId={topicId}
              subtopicTitle={item.title}
              onClose={() => setShowMobileAi(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
