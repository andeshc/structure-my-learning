# AI Tutor — UX Specification

Status: Draft for review · Owner: product/eng · Last updated: 2026-06-29

## Decisions locked in (from requirements review)

- **Response format:** lightweight HTML on the wire (`p, strong, em, ul, ol, li, code, a`),
  rendered through the existing DOMPurify sanitize path (shared with `LessonContent`). No
  markdown renderer. Consistent with CLAUDE.md "Output is HTML, never markdown."
- **Grounding:** whole-guide aware — tutor receives the **current subtopic's full content**
  plus a **titles-only outline of sibling subtopics**, so it can connect ideas across the
  guide without blowing the token budget.
- **Interaction model:** docked side drawer (desktop), bottom sheet (mobile).
- **Persistence:** each subtopic owns a persistent thread keyed on `(user, subtopic)`.

## Current layout this builds on

- **Desktop (`xl`)** — 2-column grid: a **300px left sidebar** (back-link → guide-progress
  card → scrollable guide outline → AI Tutor crammed at the bottom) and the **reading
  column** (header, lesson card, prev/next, disclaimer).
- **Mobile** — sidebar hidden; tutor is an amber FAB → bottom sheet.
- **Tokens** — tutor accent amber (`#fffaf0` / amber-600); user bubbles blue
  (`blue-50` / `blue-900`); tutor bubbles white / slate-700; current-item highlight blue;
  completed emerald.

---

## 1. Goals & principles

- **Companion, not interruption.** The tutor sits *beside* the lesson so the learner never
  loses their place. Reading column width is preserved.
- **Visibly grounded.** The UI makes it obvious the tutor has read *this* lesson and knows
  the *whole guide* — that's the trust differential vs. a generic chatbot.
- **Continuous.** Each subtopic owns a persistent thread; returning feels like resuming a
  conversation, not starting over.
- **Quiet by default.** Collapsed and unobtrusive until invoked; one click/keypress away.

## 2. Information architecture — three zones (desktop)

The tutor moves **out of the left sidebar** into a dedicated **right-hand docked drawer**,
giving a clean reading triad. The left sidebar reverts to just progress + outline.

```
┌──────────────┬─────────────────────────────┬───────────────────────┐
│ LEFT SIDEBAR │       READING COLUMN         │   TUTOR DRAWER (right) │
│ (300px)      │       (max ~720px)           │   (collapsed: 56px rail│
│              │                              │    expanded: ~380px)   │
│ ‹ Guide      │  Lesson 3 of 8               │  ┌──────────────────┐  │
│ Progress 42% │  ── Title ──                 │  │ 🤖 AI Tutor   ⤫ │  │
│ ▓▓▓░░░       │  Overview…                   │  ├──────────────────┤  │
│              │                              │  │ Context chip:    │  │
│ GUIDE OUTLINE│  [ lesson HTML … ]           │  │ "Knows this lesson│  │
│ • Sec 1      │                              │  │  + your guide"   │  │
│   ✓ Intro    │                              │  │                  │  │
│ ▸ Sec 2      │                              │  │ [ message thread]│  │
│   ● This one │                              │  │                  │  │
│   ○ Next     │                              │  │ [ composer ]     │  │
└──────────────┴─────────────────────────────┴───────────────────────┘
```

**Collapsed state** = a thin amber **rail** pinned to the right edge: vertical "Ask the
tutor" label + Bot icon + a small unread/last-activity dot if a thread exists. Clicking the
rail (or `⌘/Ctrl-J`) expands the drawer. The reading column **shifts left and narrows
gracefully**; it does *not* get overlaid (drawer pushes, doesn't cover, on `xl`+). On `lg`
(narrower desktops) the drawer **overlays** with a scrim instead of pushing, to protect
reading width.

State persists per user (localStorage): if they last left it open, it opens open.

## 3. Drawer anatomy (expanded)

```
┌─────────────────────────────────────┐
│ 🤖  AI Tutor                  ⤢  ⤫ │  ← header: title, expand-wide, close
├─────────────────────────────────────┤
│ 📖 Grounded in "Polymorphism"       │  ← context chip (this subtopic)
│    + aware of all 8 lessons   ⌄     │     tap ⌄ → "What can it see?" popover
├─────────────────────────────────────┤
│                                     │
│  ╭─ Try asking ───────────────╮     │  ← starter chips (empty state only)
│  │ • Explain this more simply │     │
│  │ • Give me an example       │     │
│  │ • How does this relate to  │     │
│  │   section 2?               │     │
│  ╰────────────────────────────╯     │
│                                     │
│            ┌──────────────────────┐ │
│   user →   │ what's a vtable?     │ │  ← blue bubble, right aligned
│            └──────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │ A vtable is… <p><code>…</code> │ │  ← tutor bubble (rendered HTML),
│  │ • bullet                       │ │     white/slate, left aligned
│  └────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐ ➤  │  ← composer
│ │ Ask about this lesson…      │     │
│ └─────────────────────────────┘     │
│ AI-generated — verify independently │  ← persistent micro-disclaimer
└─────────────────────────────────────┘
```

**Header:** Bot icon + "AI Tutor". `⤢` toggles a **wide reading mode** (drawer to ~50% for
long, code-heavy answers). `⤫` collapses back to the rail (does *not* delete the thread).

**Context chip (the "grounded" signal):** Reads
`📖 Grounded in "<subtopic title>" · aware of all N lessons`. A `⌄` opens a small **"What the
tutor can see"** popover: *"This lesson's full content, plus the titles of every lesson in
this guide — so it can connect ideas across the guide."* This is how we make whole-guide
grounding legible without exposing raw context.

## 4. Message rendering

- **Tutor messages**: rendered **lightweight HTML** (`p, strong, em, ul, ol, li, code, a`)
  through the shared sanitizer. White bubble, slate-700 text, left-aligned with a small Bot
  avatar. Links open in a new tab with an external-link affordance. `<code>` gets a subtle
  mono/tinted background; inline only (no fenced blocks in lightweight mode — see §11 open
  question).
- **User messages**: blue bubble (`blue-50` / `blue-900`), right-aligned, plain text.
- **Streaming**: tokens append live; sanitize each frame so partial tags never break layout.
  A soft caret/typing shimmer at the tail. Auto-scroll to bottom *only if* the user is
  already near the bottom (don't yank them up if they scrolled to re-read).
- **Timestamps**: hidden by default; show on hover/long-press per message (keeps the thread
  clean).

## 5. Starter questions (seeded per subtopic)

Shown **only when the thread is empty**. 3–4 chips, two kinds:

- **Generic-but-scoped**: "Explain this more simply", "Give me an example", "Quiz me on this".
- **Cross-guide** (the differentiator): "How does this relate to `<a sibling section title>`?"
  — generated from the guide outline.

Tapping a chip submits it as the user's first message. Chips disappear once the thread has
content (resurface via an empty-thread "New question?" affordance only after a reset).

## 6. Persistence UX (per subtopic)

- Opening a subtopic **loads its saved thread**; the drawer shows history immediately
  (scrolled to bottom).
- Switching subtopics swaps to *that* subtopic's thread. The context chip updates. A subtle
  transition (fade) signals "new conversation context."
- **Overflow menu (`⋯`)** in the header: **"Clear this conversation"** (confirm dialog:
  "Clear your tutor chat for this lesson? This can't be undone."). No cross-subtopic history
  browser in v1 — threads live where they were created.
- Empty-state copy after clearing: "Cleared. Ask me anything about this lesson."

## 7. States (the full matrix)

| State | Treatment |
|---|---|
| **Empty / first visit** | Context chip + starter chips + composer. Friendly one-liner: "I've read this lesson — ask me anything." |
| **Loading saved thread** | Three skeleton bubbles (alternating sides) for ~300ms; no spinner flash if cache is warm. |
| **Submitting** | User bubble appears instantly; composer disables send; "Thinking…" pulse bubble. |
| **Streaming** | Live HTML append + tail shimmer; stop button (`■`) replaces send to cancel. |
| **Error (502 / model down)** | Inline red bubble: "The tutor's unavailable right now." + **Retry** button that re-sends the last user turn. Thread preserved. |
| **Rate-limited** (`aiRateLimit`) | Amber inline notice: "You're asking quickly — give me a moment." with a soft countdown; composer disabled until reset. |
| **Lesson content not ready** (`devStatus` pending/developing) | Tutor still available but context chip reads "Lesson still generating — answers may be limited," and starters hide the cross-section ones. |
| **Offline** | Composer disabled, banner: "You're offline. Reconnect to chat." Thread still readable. |
| **Long thread** | Virtualized/clamped scroll region; a "Jump to latest ↓" pill appears when scrolled up during streaming. |

## 8. Mobile & responsive

- **`< xl`**: the drawer becomes a **bottom sheet** invoked by the existing amber FAB (keep
  it). Sheet opens to ~75% height, draggable to full-screen, swipe-down to dismiss. Same
  anatomy: context chip → thread → composer pinned above the keyboard.
- FAB shows a small dot when a saved thread exists for the current subtopic.
- **Tablet (`lg`)**: drawer overlays with scrim (protects reading width) rather than pushing.
- **Desktop (`xl`+)**: drawer pushes content; rail when collapsed.
- Composer stays keyboard-anchored on mobile; thread auto-scrolls above the keyboard.

## 9. Accessibility

- Drawer is a labeled `complementary` / `dialog` region; expanding moves focus to the
  composer; collapsing returns focus to the rail/FAB.
- Full keyboard: `⌘/Ctrl-J` toggle, `Esc` collapses, `Enter` sends / `Shift-Enter` newline,
  arrow-navigable starter chips.
- Streaming announced politely via an `aria-live="polite"` region (announce on completion,
  not per token, to avoid screen-reader spam).
- Respect `prefers-reduced-motion`: no shimmer/slide, just instant state changes.
- Color is never the only signal (icons + labels on user/tutor, error, completed).
- Min 44px touch targets; visible focus rings (reuse blue focus ring).

## 10. Microcopy

- Composer placeholder: **"Ask about this lesson…"**
- Context chip: **"Grounded in '<title>' · aware of all N lessons"**
- Disclaimer (persistent, small): **"AI-generated — verify important information
  independently."** (mirrors the lesson-page disclaimer for consistency).
- Send tooltip: "Send (Enter)". Stop: "Stop generating".

## 11. Edge cases & decisions to confirm

- **Switching subtopics mid-stream:** cancel the in-flight stream, save the partial tutor
  message with a "(stopped)" marker, swap to the new thread.
- **Very long / code-heavy answers:** the `⤢` wide mode covers this. **Open question:**
  lightweight HTML excludes fenced `<pre>` code blocks — for a *programming* learning app
  that may be too thin. Recommend allowing `<pre>` + `<code>` (still no `<img>`/tables) so
  code answers read well. Worth your call.
- **Sanitization fallback:** if a tutor message fails to parse as safe HTML, render it as
  escaped plain text rather than dropping it.
- **Link safety:** all tutor links `rel="noopener nofollow"`, new tab, external-link icon.

## 12. API / endpoint contract (per-subtopic)

The chat endpoint moves from **topic-scoped** to **subtopic-scoped**. Today
`POST /api/topics/:topicId/chat` only receives `messages`, and the system prompt knows only
`topic.title` + `guide.title` — it has no idea which subtopic the learner is reading. The
drawer already knows `position`, so we route it through.

**New endpoints** (mirrors the existing `GET /api/topics/:topicId/subtopics/:position` shape):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/topics/:topicId/subtopics/:position/chat` | Send a turn; streams the grounded HTML reply. |
| `GET` | `/api/topics/:topicId/subtopics/:position/chat` | Load the saved thread for this subtopic on drawer mount. |
| `DELETE` | `/api/topics/:topicId/subtopics/:position/chat` | Clear this subtopic's conversation ("Clear this conversation"). |

**Server responsibilities on `POST`:**

1. Resolve the subtopic at `(topicId, position)` for the authenticated user (reuse the same
   lookup that powers `getSubtopic`); 404 if not found.
2. Build the **grounded context**: the current subtopic's full `contentHtml` + title, plus a
   **titles-only outline** of sibling subtopics in the guide (for cross-section references).
   Sibling bodies are *not* included — titles only, to bound token cost.
3. Instruct the model to emit **lightweight HTML** (the allow-list in §4), not markdown.
4. Persist the user turn and the (final) tutor turn keyed on `(user, subtopic)` — see §6.

**Notes**
- `topicId` stays in the path so the existing `findTopicForUser` auth/ownership check is
  reused; `position` selects the subtopic within it.
- `aiRateLimit` continues to guard the `POST`.
- The widget passes `position` (already in scope at `SubtopicDetailPage.jsx`) instead of only
  `topicId`. The old `POST /api/topics/:topicId/chat` route is removed once the drawer is
  cut over (no other caller).

---

## Open questions for sign-off

1. **Code blocks** — keep strictly lightweight (inline `<code>` only), or allow `<pre>`
   blocks given this is a learning/often-programming app? (Recommendation: allow `<pre>`.)
2. **Drawer behavior on mid-width desktop (`lg`)** — push-and-narrow vs. overlay-with-scrim.
   (Recommendation: overlay at `lg`, push only at `xl`+.)
