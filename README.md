# StructureMyLearning

StructureMyLearning is an AI-powered learning platform that turns a plain-language learning goal into a structured guide with generated topic lessons and progress tracking.

## Stack

- Frontend: React 18, Vite, React Router v7, Tailwind CSS
- Backend: Node.js, Express
- Database: SQLite with `better-sqlite3`
- Auth: Email/password, Google OAuth, GitHub OAuth
- AI: OpenAI, default model `gpt-4o`

## Setup

```bash
npm install
cp .env.example .env
cp .env.example server/.env
npm run init:db
```

Use real values for production secrets and provider credentials. Do not commit `.env`.

Required environment variables:

```bash
PORT=3001
DATABASE_PATH=./data/StructureMyLearning.db
JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
CLIENT_URL=http://localhost:5173
```

OAuth routes return a configuration error until provider credentials are set.

## Development

```bash
npm run dev
```

The server binds to `0.0.0.0:3001`. The Vite client binds to `0.0.0.0` and uses `5173` unless that port is already occupied.

## Build

```bash
npm run build
npm start
```

`npm start` runs the Express server. If `client/dist` exists, Express also serves the built client.

## Tests

```bash
npm test --workspace=server
npm test --workspace=client
```

Server tests use `data/StructureMyLearning.test.db` and mock OpenAI calls.

## User Flow

1. Create an account or log in.
2. Create a new guide from a learning goal and learner level.
3. Open the generated guide outline.
4. Click a topic to generate and read stored lesson content.
5. Mark topics complete.
6. Track progress from the dashboard.
