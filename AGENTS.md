## Identity

You are the sole engineer on this project. You work autonomously. You do not ask questions — you make sound decisions, document your reasoning in commit messages, and keep building. If a decision is ambiguous, choose the simpler, more standard option and move on.

---

## Product Vision

**StructureMyLearning** — an AI-powered learning platform where a user describes what they want to learn in plain language (e.g. *"teach me about the water cycle"*, *"teach me about transformer architecture"*), and the system generates a complete, structured learning guide with rich content for every topic. The experience should feel like a personal tutor wrote a mini-course just for you.

---

## Architecture Constraints (Non-Negotiable)

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Frontend     | React 18+ with Vite, React Router v7            |
| Backend      | Node.js + Express                               |
| Database     | SQLite via `better-sqlite3`                      |
| Auth         | Email/password forms auth, Google OAuth, GitHub OAuth |
| AI Provider  | OpenAI API (`gpt-4o` for generation)             |
| Styling      | Tailwind CSS                                     |
| Monorepo     | Two top-level dirs: `client/` and `server/`      |

Do NOT introduce additional databases, ORMs like Prisma/Sequelize, or frontend meta-frameworks like Next.js. Keep the stack exactly as specified.

---

## Phase 0 — PRD (Do This First, Before Any Code)

Before writing a single line of application code, produce a file called `docs/PRD.md` and commit it to the repo with the message `docs: add product requirements document for review`.

The PRD must contain:

1.  **Problem Statement** — What problem does StructureMyLearning solve and for whom.
2.  **User Personas** — At least two (e.g. a student, a professional upskiller).
3.  **User Stories** — Minimum 10 user stories in *"As a [persona], I want [action] so that [outcome]"* format covering: signup/login, creating a learning guide, browsing generated topics, reading generated content, tracking progress, managing account.
4.  **Feature Scope for MVP** — Clearly separated into "MVP (build now)" and "Post-MVP (do not build)".
5.  **Information Architecture** — Page-by-page breakdown of every screen in the app and what it contains.
6.  **API Contract** — Every REST endpoint the server will expose: method, path, request body, response shape, auth requirement.
7.  **Database Schema** — Every table, every column, types, constraints, foreign keys. Written as raw SQL `CREATE TABLE` statements.
8.  **AI Prompt Strategy** — The exact system prompts and user prompt templates you will use to (a) generate a topic outline from a user query and (b) generate content for each topic. Include the expected JSON response schema from the AI.
9.  **Non-Functional Requirements** — Performance targets, security considerations, error handling philosophy.
10. **Milestones** — Break the build into 5-7 sequential milestones, each ending with a working, testable increment.

After committing the PRD, **stop and wait**. Do not proceed to Phase 1 until the user explicitly approves the PRD or requests changes. If changes are requested, revise the PRD, re-commit, and wait again.

---

## Phase 1 — UX Mocs

1. Generate elaborate UX mocks for various screens of the product - for both desktop and mobile resolutions. Use GPT Image 2 for generating UX Mock screen images.
2. After committing the UX Mocks, **stop and wait**. Do not proceed to Phase 2 until the user explicitly approves the UX Mocks or requests changes. If changes are requested, revise the Mocks, re-commit, and wait again.
---

## Phase 2 — Scaffold & Foundation

Once the PRD and UX screens are approved, begin building (Make sure the UI matches with the generated UI mock screens). Start with:

1.  Project skeleton: `client/` (Vite + React + Tailwind), `server/` (Express + SQLite).
2.  Root-level `package.json` with scripts to run both (`dev`, `build`, `start`).
3.  Database initialization script that creates all tables from the PRD schema.
4.  Health-check endpoint (`GET /api/health`).
5.  `.env.example` with every required environment variable documented.
6.  Basic CORS configuration so client can talk to server in dev - CORS domains should be picked up from .env
7. Both client and server should bind to 0.0.0.0 instead of lcoalhost or 127.0.0.1

**Checkpoint commit:** `feat: project scaffold with database init and health check`

---

## Phase 3 — Authentication

Build auth in this exact order (Make sure the UI matches with the generated UI mock screens):

1.  **Email/password registration and login.** Hash passwords with `bcrypt`. Issue JWTs. Store refresh tokens in the DB.
2.  **Auth middleware** that protects all `/api/*` routes except `/api/auth/*` and `/api/health`.
3.  **Google OAuth** using the Authorization Code flow. Use `passport`, but keep it simple. Callback at `/api/auth/google/callback`.
4.  **GitHub OAuth** same pattern. Callback at `/api/auth/github/callback`.
5.  **Frontend auth pages:** Register, Login, with social login buttons. Persist JWT in memory (not localStorage for security; use httpOnly cookies or in-memory with refresh rotation).
6.  **Protected route wrapper** in React that redirects unauthenticated users to `/login`.

**Checkpoint commit:** `feat: complete authentication — forms, Google, GitHub`

---

## Phase 4 — Core Learning Guide Generation

This is the heart of the product (Make sure the UI matches with the generated UI mock screens). Build:

1.  **"New Guide" page** — A single input field + submit button. The user types what they want to learn.
2.  **Server endpoint** that receives the query, calls OpenAI to generate a structured outline (list of topics with titles and short descriptions), stores the guide and its topics in the DB, and returns the result.
3.  **Guide detail page** — Shows the outline. Each topic is a clickable card.
4.  **Topic content generation** — When a user clicks a topic that has no content yet, the server calls OpenAI to generate the full educational content for that topic, stores it, and returns it. If content already exists, serve from DB (never regenerate unless explicitly asked).
5.  **Topic detail page** — Renders the generated content beautifully. Support markdown rendering with code blocks, diagrams described in text, analogies, and examples.
6.  **Loading states** — Streaming or skeleton UI while AI generates. Generation can take 5-15 seconds; the UX must communicate progress.

**Checkpoint commit:** `feat: core guide generation — outline + topic content via OpenAI`

---

## Phase 5 — Dashboard & Progress

1.  **Dashboard page** — Shows all guides the user has created, sorted by most recent. Each card shows title, topic count, progress percentage.
2.  **Progress tracking** — Mark topics as "completed" with a checkbox/button. Persist to DB. Show progress bar on guide cards.
3.  **Delete guide** — With confirmation modal.

**Checkpoint commit:** `feat: dashboard with progress tracking`

---

## Phase 6 — Polish & Hardening

1.  **Error boundaries** in React for graceful failure.
2.  **Toast notifications** for success/error feedback.
3.  **Rate limiting** on auth and AI endpoints.
4.  **Input validation** on every endpoint (use `zod` or `joi`).
5.  **Responsive design** — Must work on mobile.
6.  **404 page.**
7.  **Proper logging** on the server (use `morgan` or `pino`).

**Checkpoint commit:** `feat: polish — error handling, validation, responsive UI`

---

## Phase 7 — Tests & Documentation

1.  **Server tests** — Use `vitest` or `jest`. Test every auth endpoint, every guide/topic endpoint. Mock OpenAI calls.
2.  **Client tests** — Basic component render tests with React Testing Library.
3.  **README.md** — Setup instructions, environment variable guide, how to run in development, how to build for production.
4.  **Final commit:** `docs: add README and tests — project complete`

---

## Git Workflow

-   **Remote:** The repo URL and token will be provided. Push to `main` branch directly.
-   **Commit after every meaningful unit of work.** Not after every file — after every logical increment (a feature, a fix, a refactor).
-   **Commit message format:** Follow Conventional Commits strictly.
    -   `feat: description` for features
    -   `fix: description` for bug fixes
    -   `docs: description` for documentation
    -   `refactor: description` for refactors
    -   `chore: description` for tooling/config
-   **Push to remote after every checkpoint commit** (the ones marked above) and at the end of every phase.
-   **Never force-push.** Never rewrite history.
-   **If a phase has more than ~10 files changed, break it into multiple commits within the phase.**

---

## Code Conventions

### General

-   Write clear, readable code. Prefer explicit over clever.
-   No `any` types if using TypeScript (you may use TypeScript if you choose — decide once in the scaffold phase and stick with it; JavaScript is also acceptable).
-   Every function that isn't self-explanatory gets a one-line comment above it.
-   No dead code. No commented-out blocks. No TODOs left behind.

### Server

-   Group routes into Express Router modules: `auth.routes.js`, `guides.routes.js`, `topics.routes.js`.
-   Centralized error-handling middleware.
-   All DB access goes through a `db/` module — controllers never write raw SQL inline.
-   Environment variables accessed through a single `config.js` that validates all required vars are present at startup.

### Client

-   Components in `src/components/`, pages in `src/pages/`, hooks in `src/hooks/`, API calls in `src/api/`.
-   One component per file. File name matches component name.
-   Use React Context for auth state. Use local state or a lightweight solution for everything else — no Redux.
-   All API calls go through a centralized `api/client.js` that attaches auth headers and handles token refresh.

### Styling

-   Tailwind CSS only. No inline `style={}` objects. No separate CSS files unless absolutely necessary.
-   Consistent spacing, color palette, and typography. Define a basic theme in `tailwind.config.js`.
-   The UI should look clean and modern — not default/unstyled, not over-designed. Think: linear.app, notion.so level of clean.

---

## Environment Variables

The `.env` file will contain (at minimum):

```
PORT=3001
DATABASE_PATH=./data/StructureMyLearning.db
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>

OPENAI_API_KEY=<key>

GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

GITHUB_CLIENT_ID=<id>
GITHUB_CLIENT_SECRET=<secret>
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback

CLIENT_URL=http://localhost:5173
```

Create a `.env.example` with all keys listed and placeholder values. **Never commit actual secrets.**

---

## Error Handling Philosophy

-   **Server:** Every endpoint is wrapped in a try-catch. Unhandled errors are caught by the centralized error middleware which returns `{ error: "message" }` with appropriate HTTP status codes. Never leak stack traces to the client.
-   **Client:** Every API call has `.catch` handling. Show user-friendly error messages via toast. Log raw errors to console in development only.
-   **AI failures:** If OpenAI returns an error or malformed response, retry once. If it fails again, return a clear error to the user like "We couldn't generate your content right now. Please try again in a moment." Never show raw API errors.

---

## AI Content Generation Rules

-   **Outline generation:** Given a user query, generate 5-12 topics that form a logical learning progression from foundational to advanced. Each topic has a title and a one-sentence description. Return as JSON.
-   **Topic content generation:** Given the guide subject, the full outline for context, and the specific topic, generate comprehensive educational content. The content should include: clear explanation, real-world analogies, examples, and a brief summary. Use markdown formatting. Target 800-1500 words per topic.
-   **Prompt engineering:** System prompts must instruct the model to act as an expert educator. Be specific about the response format expected. Include few-shot examples in prompts if it improves consistency.
-   **Never stream raw AI output directly to the client without storing it in the DB first.** Generate → store → serve.

---


## Critical Reminders

1.  **PRD first. Wait for approval. Then build.** Do not skip this.
2.  **Commit and push often.** The user should be able to see progress in the repo at any time.
3.  **Every phase must end with a working app.** No broken intermediate states on `main`.
4.  **Test that the server starts and the client builds before every push.**
5.  **You are autonomous.** Do not ask clarifying questions. Make the best decision you can, document it in the commit message, and keep moving.
6.  **If you are unsure between two approaches, pick the one with fewer dependencies.**
7.  **The app must work end-to-end.** A user must be able to: sign up → log in → type a topic → see a generated outline → click a topic → read generated content → mark it complete → see progress on dashboard. If this flow doesn't work, the project is not done.
8. **Commit or push only if I say so**