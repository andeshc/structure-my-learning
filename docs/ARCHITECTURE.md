# Architecture

Data flow, types, and module contracts for the lesson pipeline. Prompt bodies are in `specs/generation-review-prompts.md`; config values in `CONFIG.md`. This doc is the implementation contract.

## Data flow

```
generateLesson(topic, levelId, coverageId, contentType, { codeLanguage?, illustrations? })
        │
        ▼
resolve(...)  ──────────────►  Slots
        │   concept_budget = budget(level, coverage)
        │   [wMin,wMax]    = level.baseline_word_count × coverage.length_multiplier
        │   policy         = image_policy[levelId];  type = content_types[contentType]
        │   allowed_tags   = html_allowed_tags + type.extra_tags
        │   building_blocks, content_directives, type_review_checks, format_conventions, …
        ▼
generate(slots)  ───────────►  draft: string   (HTML fragment + [[IMAGE_id]] markers + ===IMAGES=== trailer)
        │
        ▼  (only if level.readability_fk[1] <= 12)
readabilityGate(stripForReadability(draft), …)
        │   fail → regenerate with down-shift note (≤ 2 retries)
        ▼  (only if contentType === "coding" && sandboxable)
codeGate(draft, codeLanguage, runSandbox)
        │   error → regenerate with the failing snippet + error (≤ 2 retries)
        ▼
review(slots, draft)  ──────►  ReviewResult   (verdict + checks + type_specific + priority_fixes + revised_essay?)
        │
        ├─ pass        → essay = draft
        ├─ revise      → essay = revised_essay
        └─ regenerate  → essay = generate(slots + priority_fixes)
        │
        ▼
insertImageMarkers(essay, imgs) ─►  HTML with <figure> blocks, trailer stripped
        │
        ▼
sanitizeHtml(html, slots.allowed_tags) ─►  final HTML lesson
```

Two LLM calls (`generate`, `review`); the gates and everything after `review` are deterministic.

## Types (`src/types.ts`)

```ts
export type LevelId =
  | "early_learner" | "young_child" | "middle_schooler" | "high_schooler"
  | "adult_beginner" | "adult_intermediate" | "adult_advanced";

export type CoverageId = "overview" | "balanced" | "comprehensive";

export type Posture = "leading" | "integrated" | "supportive" | "sparing" | "diagram_only";

export type ContentTypeId = "conceptual" | "coding" | "mathematical" | "procedural";

export interface ContentType {
  label: string;
  requires?: string[];                 // e.g. ["code_language"] for coding
  building_blocks: string[];
  generator_directives: string;        // may contain {{code_language}}
  extra_tags: string[];                // added to html_allowed_tags
  extra_attrs: Record<string, string[]>; // e.g. { code: ["class"] }
  code_class_pattern?: string;         // coding: allowed class regex on <code>
  render?: "katex" | "syntax_highlight";
  review_checks: string[];             // may contain {{code_language}}
}

export interface LevelProfile {
  label: string;
  age_range: [number, number] | null;
  delivery: string;
  readability_fk: [number, number];
  vocabulary: string;
  sentence_words: [number, number];
  concepts_per_section: number;
  analogy_density: string;
  abstraction: string;
  assumed_knowledge: string;
  tone: string;
  baseline_word_count: [number, number];
  concept_cap: number | null;          // null = adult_advanced (topic-driven)
  avoid: string[];
  audience_mindset: string;
}

export interface Coverage {
  length_multiplier: number;           // ×baseline word count
  concept_fraction: number;            // fraction of concept_cap to use
  scope: string;
}

export interface ImagePolicy {
  posture: Posture;
  min_relevance: number;               // used only by the decoupled fallback pass
  position: "before" | "after";
  max_images: number;
}

export interface ContentConfig {
  levels: Record<LevelId, LevelProfile>;
  coverage: Record<CoverageId, Coverage>;
  image_policy: Record<LevelId, ImagePolicy>;
  posture_explanation: Record<Posture, string>;
  caption_guidance: Record<LevelId, string>;
  html_allowed_tags: string[];         // base generator tags (figure/img/figcaption added at insertion)
  advanced_concept_demand: Record<CoverageId, number>; // used when concept_cap is null
  content_types: Record<ContentTypeId, ContentType>;
}

export interface Illustration { id: string; prompt: string; url: string; }

export interface Slots {
  level_label: string;
  audience_mindset: string;
  fk_min: number; fk_max: number;
  vocabulary: string;
  sentence_min: number; sentence_max: number;
  concepts_per_section: number;
  abstraction: string;
  analogy_density: string;
  assumed_knowledge: string;
  tone: string;
  avoid_list: string;                  // joined
  concept_budget: number;
  word_min: number; word_max: number;
  coverage_mode: CoverageId;
  coverage_scope: string;
  max_images: number;
  posture: Posture;
  posture_explanation: string;
  caption_guidance: string;
  illustrations_block: string;         // "IMAGE_1: <prompt>\nIMAGE_2: <prompt>"
  // content type:
  content_type_label: string;
  building_blocks: string;             // joined
  content_directives: string;          // {{code_language}} filled
  type_review_checks: string;          // joined, {{code_language}} filled
  format_conventions: string;          // task-prompt bullets, "" for conceptual
  allowed_tags: string[];              // base + content type extra_tags
  allowed_tags_inline: string;         // "<h1> <p> …" for the prompt
  code_language?: string;              // required when content type is coding
  // carried for downstream, not template slots:
  _levelId: LevelId;
  _contentTypeId: ContentTypeId;
  _imgs: Illustration[];
}

export interface ReviewResult {
  verdict: "pass" | "revise" | "regenerate";
  checks: {
    concept_count:     { found: number; ceiling: number; pass: boolean; note?: string };
    vocabulary:        { pass: boolean; violations: string[] };
    tone_register:     { pass: boolean; note?: string };
    scaffolding:       { pass: boolean; note?: string };
    coverage_fidelity: { pass: boolean; note?: string };
    length:            { found: number; target: [number, number]; pass: boolean };
    markers_preserved: { pass: boolean; note?: string };
    type_specific:     { pass: boolean; results: { check: string; pass: boolean; note?: string }[] };
    accuracy_flags:    string[];
  };
  priority_fixes: string[];
  revised_essay?: string;
}
```

## Module contracts

| Function | Signature | Responsibility | Governing spec |
|---|---|---|---|
| `loadConfig` | `() => ContentConfig` | Load + validate `content-config.json`. Throw on missing level/content-type, empty tag list, non-positive multiplier. | CONFIG.md |
| `resolve` | `(cfg, topic, levelId, coverageId, contentTypeId, opts) => Slots` | Compute budgets, resolve content type + tags, assemble every slot. | CONFIG.md (resolve), learner-profiles.md |
| `buildGeneratorSystem` | `(s: Slots) => string` | Generator system prompt with slots filled. | generation-review-prompts.md §1 |
| `buildGeneratorTask` | `(s: Slots, extra?: string) => string` | Generator task prompt; `extra` carries down-shift / fix-code / priority-fix notes. | generation-review-prompts.md §2 |
| `buildReviewerSystem` | `(s: Slots) => string` | Reviewer system prompt. | generation-review-prompts.md §3 |
| `buildReviewerTask` | `(s: Slots, draft: string) => string` | Reviewer task: spec + draft. | generation-review-prompts.md §3 |
| `generate` | `(s: Slots, extra?: string) => Promise<string>` | LLM call 1 → raw draft. | — |
| `stripForReadability` | `(s: string) => string` | Remove trailer, markers, HTML tags → plain text. | generation-review-prompts.md §5 |
| `readabilityGate` | `(text, fkMin, fkMax) => {grade, pass}` | FK grade check with margin. | generation-review-prompts.md §4 |
| `extractCodeBlocks` | `(draft, language) => string[]` | Pull + HTML-unescape `language-X` code blocks. | generation-review-prompts.md §4b |
| `codeGate` | `(draft, language, run) => {pass, code?, error?}` | Run each code block in a sandbox; fail on error. | generation-review-prompts.md §4b |
| `review` | `(s: Slots, draft: string) => Promise<ReviewResult>` | LLM call 2; parse + validate JSON. | generation-review-prompts.md §3 |
| `insertImageMarkers` | `(essay: string, imgs: Illustration[]) => string` | Parse trailer captions; swap markers → `<figure>`; drop unplaced markers + trailer. | generation-review-prompts.md §5 |
| `sanitizeHtml` | `(html: string, allowed: string[]) => string` | Allow-list sanitize from resolved tags; allow figure/img/figcaption (+ `class` on `<code>` for coding). | CLAUDE.md conventions |
| `generateLesson` | `(topic, levelId, coverageId, contentTypeId, opts?) => Promise<string>` | Orchestrate with both gates + verdict branch. `opts = { codeLanguage?, illustrations? }`. | generation-review-prompts.md §5 |

## LLM adapter (`src/llm.ts`)

```ts
export async function llm(system: string, user: string, opts?: {
  model?: string; maxTokens?: number; json?: boolean;
}): Promise<string>;
```

Model selection (set IDs in one place; verify current model names against Anthropic docs):
- **generate** — a capable model; quality of prose and correctness of code/math matter most here.
- **review** — a cheaper/faster model is usually fine, since it checks against an explicit rubric.
- **readability, code gate, insertion, sanitize** — no model (the code gate runs a sandbox, not an LLM).

For `review`, request strict JSON and strip any code fences before `JSON.parse`. Validate against `ReviewResult`; on parse failure, retry once with a "return only valid JSON" reminder, then treat as `regenerate`.

## Error & retry policy

- **Readability**: ≤ 2 down-shift retries, then proceed regardless.
- **Code gate** (coding only): ≤ 2 fix-code retries, then proceed to review (which flags it via `type_specific`). Sandbox is isolated, resource-limited, no network — generated code is untrusted. No sandbox for a language → skip the gate.
- **Review JSON invalid**: 1 retry, then `regenerate`.
- **Trailer malformed / markers altered** (`markers_preserved.pass === false`): treat as `regenerate`; do not salvage.
- **`regenerate` loop guard**: cap total generations per lesson (e.g. 3) to bound cost; if still failing, return the best draft with a logged warning.

## Testing (`tests/golden`)

Build a golden set and gate CI on it.

- **One topic × 7 tiers at `balanced`** (conceptual) — eyeball calibration; assert deterministic gates.
- **Coverage sweep** — one tier × {overview, balanced, comprehensive}: assert word count tracks the multiplier and `concept_budget` scales.
- **Image case** — topic with 2 illustrations: both `<figure>` blocks survive sanitization, alt text non-empty, no `[[IMAGE_` left.
- **Adult-advanced `diagram_only`** — images frequently omitted, no orphan markers.
- **Content-type cases** — same topic where it makes sense, across types:
  - `coding` (e.g. Python): code blocks carry `class="language-python"`, survive sanitization, and the code gate runs them clean.
  - `mathematical`: output contains `\(`/`$$` delimiters and they survive sanitization (KaTeX renders post-sanitize).
  - `procedural`: steps in a single `<ol>`.

Deterministic assertions (no model judgment needed):
- younger tiers: FK grade ≤ `fk_max + 1`.
- output contains only the resolved allow-list tags (+ figure family; + `class` on `<code>` for coding); no `<script>`, no `style=`, no `id=`, no `class=` except `language-*` on `<code>`.
- coding: every extracted code block runs without error in the sandbox.
- no `===IMAGES===` and no `[[IMAGE_` substrings in final output.
- prose word count within `[word_min, word_max]` band (±10%), excluding code/equations.