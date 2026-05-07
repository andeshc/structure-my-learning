# StructureMyLearning Product Requirements Document

## 1. Problem Statement

StructureMyLearning helps people turn an open-ended learning goal into a structured, personalized mini-course. A user can describe what they want to learn in plain language, choose the learner's age level, and the product generates a guided outline, detailed topic lessons, and progress tracking so the user can move through the subject with clarity.

The product is for learners who know what they want to understand but do not want to spend time designing a syllabus, finding the right sequence of topics, or collecting scattered explanations from multiple sources.

## 2. User Personas

### Student Sam

Sam is a high school or university student preparing for exams, projects, or class discussions. Sam needs clear explanations, examples, summaries, and a logical path from fundamentals to advanced ideas.

### Professional Priya

Priya is a working professional learning new technical or business skills. Priya needs concise but complete learning guides that can be studied over several sessions and tracked over time.

### Curious Casey

Casey is a self-directed lifelong learner exploring unfamiliar topics for personal interest. Casey values approachable analogies, practical examples, and the ability to revisit generated guides later.

### Educator Erin

Erin is a parent, tutor, or teacher preparing age-appropriate explanations for another learner. Erin needs the same subject to become simpler, deeper, or more mature depending on the learner's age level.

## 3. User Stories

1. As a student, I want to create an account with email and password so that my learning guides are saved privately.
2. As a professional, I want to sign in with Google so that I can start using the app without creating another password.
3. As a developer learner, I want to sign in with GitHub so that I can use an identity I already trust.
4. As a learner, I want to log out so that other people using my device cannot access my guides.
5. As a learner, I want to enter a plain-language learning goal so that the app can generate a structured guide for me.
6. As an educator, I want to choose the learner's age level so that the generated tutorial matches the right vocabulary, difficulty, examples, and depth.
7. As a student, I want the generated guide to break the subject into ordered topics so that I know what to study first, next, and last.
8. As a professional, I want to open a guide from my dashboard so that I can continue learning where I left off.
9. As a learner, I want to click a topic and generate a full lesson so that I can study the topic without searching elsewhere.
10. As a learner, I want already generated topic content to be reused so that I get fast access when I return.
11. As a student, I want lessons to include explanations, analogies, examples, and summaries so that I can understand and remember the material.
12. As a learner, I want to mark topics complete so that I can track progress through each guide.
13. As a professional, I want guide cards to show progress percentage so that I can decide what to continue next.
14. As a learner, I want to delete a guide with confirmation so that I can manage old or irrelevant guides.
15. As an account holder, I want to view my account information so that I know which email and auth method are attached to my account.

## 4. Feature Scope for MVP

### MVP (Build Now)

- Email/password registration and login.
- Google OAuth login.
- GitHub OAuth login.
- JWT access tokens with refresh token rotation stored in SQLite.
- Authenticated dashboard listing the user's guides.
- New Guide page with one learning-goal input and one required age-level selector.
- Detailed AI-generated guide outline containing ordered sections, optional subsections, and Required/Optional learning items.
- Age-appropriate guide and lesson generation for ages 8-10, ages 11-13, ages 14-17, adult beginner, and adult advanced/professional learners.
- Persisted guides and topics in SQLite.
- Lazy topic content generation when a topic is first opened.
- Markdown topic rendering with code block support.
- Topic completion tracking.
- Guide progress percentage.
- Delete guide with confirmation.
- Responsive desktop and mobile layouts.
- Toasts, error boundaries, validation, rate limiting, logging, and basic tests.

### Post-MVP (Do Not Build)

- Collaborative guides or shared classrooms.
- Public guide marketplace.
- Payments or subscription tiers.
- Real-time streaming to the client.
- File uploads or document ingestion.
- User-created topic editing.
- Spaced repetition quizzes.
- Certificates.
- Admin dashboard.
- Multi-language lesson generation.
- Native mobile apps.
- Additional AI providers.

## 5. Information Architecture

### Public Screens

#### `/login`

- Email input.
- Password input.
- Submit button.
- Google OAuth button.
- GitHub OAuth button.
- Link to registration page.
- Inline validation and toast feedback.

#### `/register`

- Name input.
- Email input.
- Password input.
- Confirm password input.
- Submit button.
- Google OAuth button.
- GitHub OAuth button.
- Link to login page.
- Inline validation and toast feedback.

#### `/auth/callback`

- Temporary OAuth completion screen.
- Reads auth result from server redirect.
- Refreshes auth context.
- Redirects to dashboard on success or login on failure.

#### `*`

- 404 page with a route back to the dashboard or login depending on auth state.

### Authenticated Screens

#### `/dashboard`

- App shell with navigation.
- Current user menu.
- Button to create a new guide.
- List of guide cards sorted by most recent.
- Each card shows guide title, original prompt, selected age level, topic count, progress bar, progress percentage, and last updated date.
- Empty state that links to New Guide.
- Delete action with confirmation modal.

#### `/guides/new`

- Single prominent input for the learning goal.
- Required age-level selector with clear options: ages 8-10, ages 11-13, ages 14-17, adult beginner, and adult advanced/professional.
- Submit button.
- Loading state while outline is generated.
- Error state for AI or validation failures.
- Success redirects to the guide detail page.

#### `/guides/:guideId`

- Guide title, original prompt, and selected age level.
- Ordered topic outline.
- Topic cards with title, one-sentence description, completed state, and generated-content indicator.
- Progress bar.
- Back link to dashboard.
- Delete guide action.

#### `/guides/:guideId/topics/:topicId`

- Guide context header with selected age level.
- Topic title.
- Completion toggle.
- Generated markdown content.
- Loading state while topic content is generated and saved.
- Previous and next topic navigation.
- Back link to guide outline.

#### `/account`

- Name.
- Email.
- Auth providers connected.
- Account creation date.
- Logout button.

## 6. API Contract

All response bodies are JSON. Protected routes require an access token through an httpOnly cookie or `Authorization: Bearer <token>` header. Auth refresh uses an httpOnly refresh cookie.

### Health

#### `GET /api/health`

Auth required: No

Response `200`:

```json
{
  "status": "ok",
  "service": "structure-my-learning"
}
```

### Auth

#### `POST /api/auth/register`

Auth required: No

Request:

```json
{
  "name": "Sam Student",
  "email": "sam@example.com",
  "password": "correct horse battery staple"
}
```

Response `201`:

```json
{
  "user": {
    "id": "usr_123",
    "name": "Sam Student",
    "email": "sam@example.com",
    "avatarUrl": null,
    "createdAt": "2026-05-05T10:00:00.000Z"
  },
  "accessToken": "jwt-access-token"
}
```

#### `POST /api/auth/login`

Auth required: No

Request:

```json
{
  "email": "sam@example.com",
  "password": "correct horse battery staple"
}
```

Response `200`:

```json
{
  "user": {
    "id": "usr_123",
    "name": "Sam Student",
    "email": "sam@example.com",
    "avatarUrl": null,
    "createdAt": "2026-05-05T10:00:00.000Z"
  },
  "accessToken": "jwt-access-token"
}
```

#### `POST /api/auth/refresh`

Auth required: Refresh cookie

Request: empty body

Response `200`:

```json
{
  "accessToken": "new-jwt-access-token"
}
```

#### `POST /api/auth/logout`

Auth required: Yes

Request: empty body

Response `200`:

```json
{
  "ok": true
}
```

#### `GET /api/auth/me`

Auth required: Yes

Response `200`:

```json
{
  "user": {
    "id": "usr_123",
    "name": "Sam Student",
    "email": "sam@example.com",
    "avatarUrl": null,
    "createdAt": "2026-05-05T10:00:00.000Z"
  }
}
```

#### `GET /api/auth/google`

Auth required: No

Response: redirects to Google authorization URL.

#### `GET /api/auth/google/callback`

Auth required: No

Response: sets refresh cookie and redirects to `${CLIENT_URL}/auth/callback?status=success`.

#### `GET /api/auth/github`

Auth required: No

Response: redirects to GitHub authorization URL.

#### `GET /api/auth/github/callback`

Auth required: No

Response: sets refresh cookie and redirects to `${CLIENT_URL}/auth/callback?status=success`.

### Guides

Valid `ageLevel` values for guide creation are `ages_8_10`, `ages_11_13`, `ages_14_17`, `adult_beginner`, and `adult_advanced`.

#### `GET /api/guides`

Auth required: Yes

Response `200`:

```json
{
  "guides": [
    {
      "id": "gde_123",
      "title": "Understanding the Water Cycle",
      "prompt": "teach me about the water cycle",
      "ageLevel": "ages_11_13",
      "topicCount": 7,
      "completedTopicCount": 2,
      "progressPercentage": 29,
      "createdAt": "2026-05-05T10:00:00.000Z",
      "updatedAt": "2026-05-05T10:30:00.000Z"
    }
  ]
}
```

#### `POST /api/guides`

Auth required: Yes

Request:

```json
{
  "prompt": "teach me about transformer architecture",
  "ageLevel": "adult_advanced"
}
```

Response `201`:

```json
{
  "guide": {
    "id": "gde_123",
    "title": "Transformer Architecture",
    "prompt": "teach me about transformer architecture",
    "ageLevel": "adult_advanced",
    "outline": {
      "title": "Transformer Architecture",
      "sections": [
        {
          "title": "Prerequisites",
          "description": "Build the machine learning, math, and NLP foundations needed before studying Transformers.",
          "subsections": [
            {
              "title": "Basic ML / Deep Learning",
              "items": [
                {
                  "importance": "Required",
                  "title": "What is machine learning?"
                },
                {
                  "importance": "Optional but recommended",
                  "title": "Overfitting and regularization"
                }
              ]
            }
          ]
        }
      ]
    },
    "createdAt": "2026-05-05T10:00:00.000Z",
    "updatedAt": "2026-05-05T10:00:00.000Z",
    "topics": [
      {
        "id": "top_123",
        "position": 1,
        "title": "Why Transformers Were Needed",
        "description": "Learn the limitations of earlier sequence models and the motivation for attention.",
        "isCompleted": false,
        "hasContent": false
      }
    ]
  }
}
```

#### `GET /api/guides/:guideId`

Auth required: Yes

Response `200`:

```json
{
  "guide": {
    "id": "gde_123",
    "title": "Transformer Architecture",
    "prompt": "teach me about transformer architecture",
    "ageLevel": "adult_advanced",
    "progressPercentage": 0,
    "outline": {
      "title": "Transformer Architecture",
      "sections": [
        {
          "title": "Attention Fundamentals",
          "description": "Understand queries, keys, values, attention scores, and weighted value lookup.",
          "items": [
            {
              "importance": "Required",
              "title": "Query, Key, Value intuition"
            },
            {
              "importance": "Optional but recommended",
              "title": "Common attention visualizations"
            }
          ]
        }
      ]
    },
    "createdAt": "2026-05-05T10:00:00.000Z",
    "updatedAt": "2026-05-05T10:00:00.000Z",
    "topics": [
      {
        "id": "top_123",
        "position": 1,
        "title": "Why Transformers Were Needed",
        "description": "Learn the limitations of earlier sequence models and the motivation for attention.",
        "isCompleted": false,
        "hasContent": false
      }
    ]
  }
}
```

#### `DELETE /api/guides/:guideId`

Auth required: Yes

Response `200`:

```json
{
  "ok": true
}
```

### Topics

#### `GET /api/topics/:topicId`

Auth required: Yes

Behavior: If `content_markdown` is empty, the server generates topic content with OpenAI, stores it, and returns the stored content. If content exists, the server returns it without regenerating.

Response `200`:

```json
{
  "guide": {
    "id": "gde_123",
    "title": "Transformer Architecture",
    "ageLevel": "adult_advanced"
  },
  "topic": {
    "id": "top_123",
    "guideId": "gde_123",
    "position": 1,
    "title": "Why Transformers Were Needed",
    "description": "Learn the limitations of earlier sequence models and the motivation for attention.",
    "contentMarkdown": "## Overview\n\n...",
    "isCompleted": false,
    "createdAt": "2026-05-05T10:00:00.000Z",
    "updatedAt": "2026-05-05T10:15:00.000Z"
  }
}
```

#### `PATCH /api/topics/:topicId/progress`

Auth required: Yes

Request:

```json
{
  "isCompleted": true
}
```

Response `200`:

```json
{
  "topic": {
    "id": "top_123",
    "isCompleted": true,
    "completedAt": "2026-05-05T10:20:00.000Z"
  },
  "guide": {
    "id": "gde_123",
    "progressPercentage": 14
  }
}
```

### Account

#### `GET /api/account`

Auth required: Yes

Response `200`:

```json
{
  "user": {
    "id": "usr_123",
    "name": "Sam Student",
    "email": "sam@example.com",
    "avatarUrl": null,
    "providers": ["password"],
    "createdAt": "2026-05-05T10:00:00.000Z"
  }
}
```

## 7. Database Schema

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (email <> '')
);

CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE guides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  age_level TEXT NOT NULL CHECK (age_level IN ('ages_8_10', 'ages_11_13', 'ages_14_17', 'adult_beginner', 'adult_advanced')),
  outline_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  guide_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_markdown TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (guide_id, position),
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

CREATE INDEX idx_guides_user_updated ON guides(user_id, updated_at DESC);
CREATE INDEX idx_topics_guide_position ON topics(guide_id, position);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

## 8. AI Prompt Strategy

The server uses the OpenAI model configured by `OPENAI_MODEL`, defaulting to `gpt-4o`, for generation. AI output is never streamed directly to the client. The server generates, validates JSON, stores records in SQLite, and then returns stored data. If the model returns malformed output or the API call fails, retry once with the same prompt. If the retry fails, return a user-friendly error.

Age-level values are stored on the guide and passed into every AI generation call:

- `ages_8_10`: elementary learner; simple vocabulary, concrete examples, gentle pacing, no assumed background knowledge.
- `ages_11_13`: middle-grade learner; clear vocabulary, light technical terms with definitions, relatable examples.
- `ages_14_17`: teen learner; stronger conceptual depth, school-level terminology, examples that connect to real applications.
- `adult_beginner`: adult learner new to the subject; respectful tone, practical examples, no childish framing.
- `adult_advanced`: adult or professional learner; deeper explanations, precise terminology, more nuance, and efficient pacing.

### Outline Generation

System prompt:

```text
You are StructureMyLearning's expert curriculum designer. Create concise, accurate, learner-friendly course outlines from plain-language learning goals.

Rules:
- Return only valid JSON.
- Arrange topics from foundational to advanced.
- Create a detailed curriculum roadmap, not a short summary.
- Use top-level sections for major learning stages.
- Use subsections when a stage has multiple prerequisite areas or architecture families.
- Every learning item must be labeled as "Required", "Optional but recommended", or "Optional and can be skipped".
- Add "details" arrays for items that naturally have sub-bullets, examples, variants, or common failure modes.
- Match the topic sequence, vocabulary, assumed background knowledge, and depth to the provided age level.
- Keep titles specific and short.
- Make each description exactly one sentence.
- Do not include markdown.
- Do not include content lessons yet.
- Avoid unsupported claims, hype, and filler.
```

User prompt template:

```text
Create a structured learning guide for this user goal:

"{{USER_PROMPT}}"

Learner age level: {{AGE_LEVEL}}
Age-level guidance: {{AGE_LEVEL_GUIDANCE}}

Return JSON matching this schema:
{
  "title": "Short guide title",
  "sections": [
    {
      "title": "Major section title",
      "description": "One sentence explaining what this section covers.",
      "items": [
        {
          "importance": "Required",
          "title": "Specific concept to learn",
          "details": ["Optional sub-point", "Optional variant or example"]
        }
      ],
      "subsections": [
        {
          "title": "Subsection title",
          "items": [
            {
              "importance": "Optional but recommended",
              "title": "Specific concept to learn",
              "details": ["Optional sub-point"]
            }
          ]
        }
      ]
    }
  ]
}

Example:
Input: "teach me about the water cycle"
Age level: ages_11_13
Output:
{
  "title": "Understanding the Water Cycle",
  "sections": [
    {
      "title": "What the Water Cycle Is",
      "description": "Understand the water cycle as the continuous movement of water through Earth and the atmosphere.",
      "items": [
        {
          "importance": "Required",
          "title": "Water moving through Earth systems"
        }
      ]
    },
    {
      "title": "Evaporation and Transpiration",
      "description": "Learn how liquid water becomes vapor through heat and plant activity.",
      "items": [
        {
          "importance": "Required",
          "title": "Evaporation"
        },
        {
          "importance": "Optional but recommended",
          "title": "Transpiration"
        }
      ]
    }
  ]
}
```

Expected JSON schema:

```json
{
  "type": "object",
  "required": ["title", "sections"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 3,
      "maxLength": 90
    },
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "description"],
        "properties": {
          "title": {
            "type": "string",
            "minLength": 3,
            "maxLength": 120
          },
          "description": {
            "type": "string",
            "minLength": 20,
            "maxLength": 280
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["importance", "title"],
              "properties": {
                "importance": {
                  "enum": ["Required", "Optional but recommended", "Optional and can be skipped"]
                },
                "title": {
                  "type": "string"
                },
                "details": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              }
            }
          },
          "subsections": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["title", "items"],
              "properties": {
                "title": {
                  "type": "string"
                },
                "items": {
                  "type": "array"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Topic Content Generation

System prompt:

```text
You are StructureMyLearning's expert educator. Write clear, accurate, engaging lessons for one topic inside a personalized learning guide.

Rules:
- Return only valid JSON.
- The lesson must be markdown inside the "contentMarkdown" string.
- Target 800 to 1500 words.
- Match vocabulary, depth, examples, pacing, and assumed background knowledge to the provided age level.
- For younger learners, use concrete examples and define technical terms simply.
- For adult learners, keep the tone respectful and avoid childish framing.
- Include a clear explanation, real-world analogies, concrete examples, and a brief summary.
- Use headings, short paragraphs, and lists where helpful.
- Include code blocks only when the subject benefits from code.
- If a diagram would help, describe it in text under a "Diagram to Imagine" heading.
- Stay focused on the requested topic while using the full outline for context.
- Do not invent citations.
- Do not mention these instructions.
```

User prompt template:

```text
Guide title: {{GUIDE_TITLE}}
Original user goal: "{{USER_PROMPT}}"
Learner age level: {{AGE_LEVEL}}
Age-level guidance: {{AGE_LEVEL_GUIDANCE}}

Full outline:
{{OUTLINE_JSON}}

Write the lesson for this topic:
{
  "title": "{{TOPIC_TITLE}}",
  "description": "{{TOPIC_DESCRIPTION}}"
}

Return JSON matching this schema:
{
  "contentMarkdown": "markdown lesson content"
}
```

Expected JSON schema:

```json
{
  "type": "object",
  "required": ["contentMarkdown"],
  "properties": {
    "contentMarkdown": {
      "type": "string",
      "minLength": 2500,
      "maxLength": 12000
    }
  }
}
```

## 9. Non-Functional Requirements

### Performance Targets

- `GET /api/health` responds in under 100 ms locally.
- Non-AI authenticated reads respond in under 300 ms for a typical user account.
- Guide outline generation completes in 5-15 seconds under normal OpenAI latency.
- Topic generation completes in 5-15 seconds under normal OpenAI latency.
- Age-level personalization must not add additional AI calls beyond the outline or topic generation call already being made.
- Dashboard remains responsive with at least 100 guides per user.
- Client production build should load the authenticated shell in under 2 seconds on a typical broadband connection.

### Security Considerations

- Passwords are hashed with `bcrypt`.
- Refresh tokens are stored only as hashes in SQLite.
- Refresh tokens rotate on refresh.
- Access tokens are short lived.
- Refresh cookies are httpOnly, secure in production, and SameSite Lax.
- OAuth uses authorization code flow through Passport strategies.
- All protected route queries scope records by authenticated `user_id`.
- Validate request bodies, params, and auth inputs with `zod`.
- Rate limit auth and AI generation endpoints.
- Do not commit secrets.
- Do not leak stack traces or raw provider errors to clients.
- CORS allowed origins come from `.env`.

### Error Handling Philosophy

- Server endpoints use route wrappers that forward errors to centralized error middleware.
- Error responses use `{ "error": "message" }`.
- Client API calls catch failures and show user-friendly toast messages.
- Raw errors are logged to the browser console only in development.
- AI failures retry once, then return: "We couldn't generate your content right now. Please try again in a moment."
- Validation errors return HTTP `400`.
- Authentication failures return HTTP `401`.
- Authorization failures return HTTP `403`.
- Missing records return HTTP `404`.

## 10. Milestones

### Milestone 1: PRD Approval

- Add this PRD.
- Commit with `docs: add product requirements document for review`.
- Stop for review before application code.

Working increment: Reviewable product and technical plan.

### Milestone 2: UX Mocks

- Produce desktop and mobile UX mocks for login, register, dashboard, new guide, guide detail, topic detail, account, and 404.
- Commit mocks for review.
- Stop for review before scaffold work.

Working increment: Reviewable UX direction for the MVP.

### Milestone 3: Scaffold and Foundation

- Create `client/` Vite React app with Tailwind.
- Create `server/` Express app with SQLite initialization.
- Add root scripts for development, build, and start.
- Add `.env.example`.
- Add CORS from env and bind both apps to `0.0.0.0`.
- Add `GET /api/health`.

Working increment: Client and server start locally, and the health endpoint responds.

### Milestone 4: Authentication

- Add email/password registration and login.
- Add JWT access tokens and refresh token rotation.
- Add auth middleware.
- Add Google and GitHub OAuth.
- Add frontend auth context, login/register pages, callback handling, protected routes, and logout.

Working increment: A user can sign up, log in, refresh auth, use OAuth, and reach protected pages.

### Milestone 5: Core Learning Generation

- Add New Guide page.
- Add age-level selector to New Guide.
- Add outline generation endpoint using the configured OpenAI model with the selected age level.
- Store guides and topics.
- Add guide detail page.
- Add lazy topic content generation using the guide's stored age level.
- Render markdown topic lessons.
- Add loading and AI error states.

Working increment: A user can create a guide, open topics, and read generated lessons.

### Milestone 6: Dashboard and Progress

- Add dashboard guide list sorted by most recent.
- Add progress percentage.
- Add topic completion toggle.
- Add delete guide flow with confirmation.

Working increment: A user can manage guides and track completion progress.

### Milestone 7: Polish, Tests, and Documentation

- Add React error boundaries.
- Add toast notifications.
- Add rate limiting.
- Add validation on every endpoint.
- Add responsive refinements and 404 page.
- Add server logging.
- Add server and client tests.
- Add README with setup and production instructions.

Working increment: The full end-to-end flow is tested, documented, and ready to run.
