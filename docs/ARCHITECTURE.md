# Architecture

Data flow, types, and module contracts for the lesson pipeline. Prompt bodies are in `specs/generation-review-prompts.md`; config values in `CONFIG.md`. This doc is the implementation contract.

## Data flow

```
generateLesson(topic, levelId, coverageId, illustrations[])
        │
        ▼
resolve(...)  ──────────────►  Slots
        │   concept_budget = budget(level, coverage)
        │   [wMin,wMax]    = level.baseline_word_count × coverage.length_multiplier
        │   policy         = image_policy[levelId]
        │   illustrations_block, caption_guidance, posture, posture_explanation, …
        ▼
generate(slots)  ───────────►  draft: string   (HTML fragment + [[IMAGE_id]] markers + ===IMAGES=== trailer)
        │
        ▼  (only if level.readability_fk[1] <= 12)
readabilityGate(stripForReadability(draft), …)
        │   fail → regenerate with down-shift note (≤ 2 retries)
        ▼
review(slots, draft)  ──────►  ReviewResult   (verdict + checks + priority_fixes + revised_essay?)
        │
        ├─ pass        → essay = draft
        ├─ revise      → essay = revised_essay
        └─ regenerate  → essay = generate(slots + priority_fixes)
        │
        ▼
insertImageMarkers(essay, imgs) ─►  HTML with <figure> blocks, trailer stripped
        │
        ▼
sanitizeHtml(html, allowedTags) ─►  final HTML lesson
```

Two LLM calls (`generate`, `review`); everything else is deterministic.

## Types (`src/types.ts`)

```ts
export type LevelId =
  | "early_learner" | "young_child" | "middle_schooler" | "high_schooler"
  | "adult_beginner" | "adult_intermediate" | "adult_advanced";

export type CoverageId = "overview" | "balanced" | "comprehensive";

export type Posture = "leading" | "integrated" | "supportive" | "sparing" | "diagram_only";

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
  html_allowed_tags: string[];         // generator output tags (figure/img/figcaption added at insertion)
  advanced_concept_demand: Record<CoverageId, number>; // used when concept_cap is null
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
  allowed_tags: string[];
  // carried for downstream, not template slots:
  _levelId: LevelId;
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
    accuracy_flags:    string[];
  };
  priority_fixes: string[];
  revised_essay?: string;
}
```

## Module contracts

| Function | Signature | Responsibility | Governing spec |
|---|---|---|---|
| `loadConfig` | `() => ContentConfig` | Load + validate `content-config.json`. Throw on missing level, empty tag list, non-positive multiplier. | CONFIG.md |
| `resolve` | `(cfg, topic, levelId, coverageId, imgs) => Slots` | Compute budgets and assemble every slot. | CONFIG.md (resolve), learner-profiles.md |
| `buildGeneratorSystem` | `(s: Slots) => string` | Generator system prompt with slots filled. | generation-review-prompts.md §1 |
| `buildGeneratorTask` | `(s: Slots, extra?: string) => string` | Generator task prompt; `extra` carries down-shift / priority-fix notes. | generation-review-prompts.md §2 |
| `buildReviewerSystem` | `(s: Slots) => string` | Reviewer system prompt. | generation-review-prompts.md §3 |
| `buildReviewerTask` | `(s: Slots, draft: string) => string` | Reviewer task: spec + draft. | generation-review-prompts.md §3 |
| `generate` | `(s: Slots, extra?: string) => Promise<string>` | LLM call 1 → raw draft. | — |
| `stripForReadability` | `(s: string) => string` | Remove trailer, markers, HTML tags → plain text. | generation-review-prompts.md §5 |
| `readabilityGate` | `(text, fkMin, fkMax) => {grade, pass}` | FK grade check with margin. | generation-review-prompts.md §4 |
| `review` | `(s: Slots, draft: string) => Promise<ReviewResult>` | LLM call 2; parse + validate JSON. | generation-review-prompts.md §3 |
| `insertImageMarkers` | `(essay: string, imgs: Illustration[]) => string` | Parse trailer captions; swap markers → `<figure>`; drop unplaced markers + trailer. | generation-review-prompts.md §5 |
| `sanitizeHtml` | `(html: string, allowed: string[]) => string` | Allow-list sanitize; allow figure/img/figcaption. | CLAUDE.md conventions |
| `generateLesson` | `(topic, levelId, coverageId, imgs?) => Promise<string>` | Orchestrate 1–9 with verdict branch. | generation-review-prompts.md §5 |

## LLM adapter (`src/llm.ts`)

```ts
export async function llm(system: string, user: string, opts?: {
  model?: string; maxTokens?: number; json?: boolean;
}): Promise<string>;
```

Model selection (set IDs in one place; verify current model names against Anthropic docs):
- **generate** — a capable model; quality of prose matters most here.
- **review** — a cheaper/faster model is usually fine, since it checks against an explicit rubric.
- **readability, insertion, sanitize** — no model.

For `review`, request strict JSON and strip any code fences before `JSON.parse`. Validate against `ReviewResult`; on parse failure, retry once with a "return only valid JSON" reminder, then treat as `regenerate`.

## Error & retry policy

- **Readability**: ≤ 2 down-shift retries, then proceed to review regardless.
- **Review JSON invalid**: 1 retry, then `regenerate`.
- **Trailer malformed / markers altered** (`markers_preserved.pass === false`): treat as `regenerate`; do not attempt to salvage.
- **`regenerate` loop guard**: cap total generations per lesson (e.g. 3) to bound cost; if still failing, return the best draft with a logged warning.

## Testing (`tests/golden`)

Build a golden set and gate CI on it.

- **One topic × 7 tiers at `balanced`** — eyeball calibration; assert deterministic gates.
- **Coverage sweep** — one tier × {overview, balanced, comprehensive}: assert word count tracks the multiplier and `concept_budget` scales.
- **Image case** — topic with 2 illustrations: assert both `<figure>` blocks survive sanitization, alt text non-empty, no `[[IMAGE_` left in output.
- **Adult-advanced `diagram_only`** — assert images are frequently omitted and output has no orphan markers.

Deterministic assertions (no model judgment needed):
- younger tiers: FK grade ≤ `fk_max + 1`.
- output contains only allow-list tags (+ figure family); no `<script>`, no `style=`, no `class=`.
- no `===IMAGES===` and no `[[IMAGE_` substrings in final output.
- word count within `[word_min, word_max]` band (±10% tolerance).