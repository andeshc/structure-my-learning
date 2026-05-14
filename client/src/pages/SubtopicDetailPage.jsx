import DOMPurify from 'dompurify';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getSubtopic } from '../api/guides';
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

const EVENT_ICONS = {
  agent_status: '◆',
  agent_tool_call: '⟳',
  agent_tool_result: '✓',
};

function AgentActivityFeed({ events, isStreaming }) {
  return (
    <div className="py-2">
      <style>{`@keyframes eventIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }`}</style>
      {events.length === 0 ? (
        <div className="flex items-center gap-2.5 text-sm text-slate-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-400" />
          Preparing lesson…
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((event, i) => {
            const isLast = i === events.length - 1;
            const isPending = isStreaming && isLast && event.type !== 'agent_tool_result';
            return (
              <div
                key={i}
                className="flex items-center gap-3 text-sm"
                style={{ animation: 'eventIn 0.2s ease forwards' }}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isPending
                    ? 'bg-blue-100 text-blue-500'
                    : event.type === 'agent_tool_result'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {isPending
                    ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                    : EVENT_ICONS[event.type] ?? '·'
                  }
                </span>
                <span className={isPending ? 'text-slate-700' : 'text-slate-400'}>
                  {event.message}
                </span>
              </div>
            );
          })}
        </div>
      )}
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

export default function SubtopicDetailPage() {
  const { topicId, position } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
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
  }, [topicId, position]);

  if (error) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return <LoadingPanel title="Loading subtopic" detail="Fetching subtopic details…" />;
  }

  const { subtopic, item, topic, guide } = data;
  const displayedHtml = subtopic?.contentHtml ?? streamedHtml;

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[70] h-0.5 bg-slate-100" />

      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link className="font-medium text-blue-700 hover:underline" to={`/guides/${guide.id}`}>
          {guide.title}
        </Link>
        <span>/</span>
        <Link className="font-medium text-slate-600 hover:text-blue-700" to={`/topics/${topic.id}`}>
          {topic.title}
        </Link>
        <span>/</span>
        <span className="truncate max-w-[200px] text-slate-400">{item.title}</span>
      </div>

      <div ref={articleRef}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-700"
                to={`/topics/${topic.id}`}
              >
                <ChevronLeft size={13} />
                {topic.title}
              </Link>
            </div>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-slate-950">{item.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <ImportanceBadge importance={item.importance} />
            </div>
            {item.overview && (
              <p className="mt-3 max-w-2xl text-slate-500">{item.overview}</p>
            )}
          </div>
        </div>

        {item.details && item.details.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.details.map((detail, i) => (
              <span key={i} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{detail}</span>
            ))}
          </div>
        )}

        {isStreaming && displayedHtml && (
          <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/3 animate-pulse bg-blue-400" />
          </div>
        )}

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

        <div className="mt-6 text-center">
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
            to={`/topics/${topic.id}`}
          >
            <ChevronLeft size={14} />
            Back to {topic.title}
          </Link>
        </div>
      </div>
    </>
  );
}
