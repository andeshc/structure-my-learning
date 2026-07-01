import { BookOpen, MessageCircle, Send, Square, Trash2, X } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTutorThread, clearTutorThread } from '../api/guides';
import { getAccessToken } from '../api/client';
import LessonContent from './LessonContent';
import LogoMark from './LogoMark';

const STORAGE_KEY = 'tutorDrawerOpen';

// The StructureMyLearning brand gradient (logomark pills), reused on the FAB,
// collapsed rail, and the panel's top accent strip.
const BRAND_GRADIENT = 'linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #2DD4BF 100%)';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function countLessons(fullOutline) {
  return (fullOutline ?? []).reduce((n, s) => n + (s.items?.length ?? 0), 0);
}

// Empty-thread suggestions: generic-but-scoped prompts plus one cross-section
// prompt seeded from a different section of the guide outline.
function buildStarters(fullOutline, topicId) {
  const starters = ['Explain this more simply', 'Give me an example', 'Quiz me on this'];
  const otherSection = (fullOutline ?? []).find((s) => s.topicId !== topicId && s.title);
  if (otherSection) starters.push(`How does this relate to ${otherSection.title}?`);
  return starters;
}

function messageText(msg) {
  return msg.parts?.find((p) => p.type === 'text')?.text ?? '';
}

function TutorPanel({ topicId, position, subtopicTitle, fullOutline, onClose, closeLabel }) {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error, setMessages, stop, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/topics/${topicId}/subtopics/${position}/chat`,
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    }),
  });
  const isLoading = status === 'streaming' || status === 'submitted';
  const bottomRef = useRef(null);

  // Hydrate the persisted thread for this subtopic. The panel is keyed by
  // subtopic, so this runs fresh on every subtopic change.
  useEffect(() => {
    let cancelled = false;
    getTutorThread(topicId, position)
      .then((res) => {
        if (!cancelled && res?.messages?.length) setMessages(res.messages);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, position]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function send(text) {
    if (!text.trim() || isLoading) return;
    sendMessage({ text });
    setInput('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  async function handleClear() {
    if (!window.confirm("Clear your tutor chat for this lesson? This can't be undone.")) return;
    try { await clearTutorThread(topicId, position); } catch { /* ignore */ }
    setMessages([]);
  }

  const starters = useMemo(() => buildStarters(fullOutline, topicId), [fullOutline, topicId]);
  const lessonCount = useMemo(() => countLessons(fullOutline), [fullOutline]);
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-[#f3fbfa]">
      {/* Brand accent strip — echoes the logomark gradient */}
      <div className="h-[3px] w-full shrink-0" style={{ background: BRAND_GRADIENT }} />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-teal-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-auto shrink-0" />
          <p className="text-sm font-bold text-slate-950">AI Tutor</p>
        </div>
        <div className="flex items-center gap-1">
          {!isEmpty && (
            <button
              aria-label="Clear this conversation"
              title="Clear this conversation"
              className="rounded-md p-1 text-slate-400 hover:text-rose-600"
              onClick={handleClear}
            >
              <Trash2 size={16} />
            </button>
          )}
          {onClose && (
            <button
              aria-label={closeLabel ?? 'Close AI tutor'}
              className="rounded-md p-1 text-slate-400 hover:text-teal-700"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Context chip — makes the grounding legible */}
      <div className="flex shrink-0 items-start gap-2 border-b border-teal-100 bg-teal-50/70 px-4 py-2 text-xs text-teal-800">
        <BookOpen size={14} className="mt-0.5 shrink-0 text-teal-600" />
        <p>
          Grounded in “<span className="font-semibold">{subtopicTitle}</span>”
          {lessonCount > 0 && <> · aware of all {lessonCount} lessons</>}
        </p>
      </div>

      {/* Thread */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
        {isEmpty && !isLoading && (
          <div className="space-y-3">
            <p className="px-1 text-sm text-slate-500">I’ve read this lesson — ask me anything.</p>
            <div className="flex flex-col gap-1.5">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const text = messageText(msg);
          if (msg.role === 'user') {
            return (
              <div
                key={msg.id}
                className="ml-6 rounded-lg bg-teal-600 px-3 py-2 text-sm leading-relaxed text-white"
              >
                {text}
              </div>
            );
          }
          return (
            <div key={msg.id} className="mr-6 rounded-lg border border-slate-100 bg-white px-3 py-2">
              {text ? (
                <LessonContent html={text} className="lesson-content tutor-message" />
              ) : (
                <span className="text-sm text-slate-400">…</span>
              )}
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="mr-6 animate-pulse rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-400">
            Thinking…
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error.message || 'The tutor is unavailable right now.'}</p>
            <button onClick={() => regenerate()} className="mt-1 font-semibold underline">
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form className="flex shrink-0 items-center gap-2 border-t border-teal-100 p-3" onSubmit={handleSubmit}>
        <input
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-100"
          placeholder="Ask about this lesson…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {isLoading ? (
          <button
            type="button"
            aria-label="Stop generating"
            onClick={() => stop()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send message"
            disabled={!input.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        )}
      </form>
      <p
        className="shrink-0 px-3 pb-2 text-[11px] text-slate-400"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        AI-generated — verify important information independently.
      </p>
    </div>
  );
}

/**
 * AI Tutor presented as a docked side drawer on desktop (collapsible to a rail;
 * pushes content at xl, overlays with a scrim at lg) and a bottom sheet on mobile.
 * `onDesktopOpenChange` lets the page reserve gutter space when docked-open at xl.
 */
export default function TutorDrawer({ topicId, position, subtopicTitle, fullOutline, onDesktopOpenChange }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(open)); } catch { /* ignore */ }
  }, [open]);

  useEffect(() => {
    onDesktopOpenChange?.(isDesktop && open);
  }, [isDesktop, open, onDesktopOpenChange]);

  // Lock page scroll while the mobile sheet is open so the page behind it can't
  // scroll (overscroll-contain on the thread handles edge chaining; this stops
  // scrolls that start outside the thread, e.g. on the header/composer).
  useEffect(() => {
    if (isDesktop || !mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isDesktop, mobileOpen]);

  const panelKey = `${topicId}-${position}`;
  const panelProps = { topicId, position, subtopicTitle, fullOutline };

  if (isDesktop) {
    if (!open) {
      return (
        <button
          aria-label="Open AI tutor"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2.5 rounded-l-xl py-4 pl-2.5 pr-2 text-white shadow-md transition-[filter] hover:brightness-110"
          style={{ background: BRAND_GRADIENT }}
        >
          <LogoMark className="h-5 w-auto" fill="white" />
          <span className="text-xs font-semibold [writing-mode:vertical-rl]">Ask the tutor</span>
        </button>
      );
    }
    return (
      <>
        {/* Scrim on lg only — at xl the page reserves space and pushes instead. */}
        <div className="fixed inset-0 z-40 bg-black/40 xl:hidden" onClick={() => setOpen(false)} />
        <aside className="fixed right-0 top-0 z-50 h-screen w-[360px] border-l border-teal-200 shadow-xl">
          <TutorPanel
            key={panelKey}
            {...panelProps}
            onClose={() => setOpen(false)}
            closeLabel="Collapse AI tutor"
          />
        </aside>
      </>
    );
  }

  // Mobile — FAB + bottom sheet. dvh + safe-area insets keep the FAB and sheet
  // clear of the browser's dynamic bottom chrome / gesture bar. Stacked above
  // the guide outline FAB (GuideOutlineDrawer.jsx), which sits at the position
  // this button used to occupy.
  return (
    <>
      {!mobileOpen && (
        <button
          aria-label="Open AI tutor"
          className="fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', background: BRAND_GRADIENT }}
          onClick={() => setMobileOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[60] h-[85dvh] overflow-hidden rounded-t-2xl shadow-2xl">
            <TutorPanel key={panelKey} {...panelProps} onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
