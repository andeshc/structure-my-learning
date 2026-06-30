# Config

`src/config/content-config.json` is the **single source of truth** for all calibration values. Prompt fragments, the readability gate, image policy, and the HTML sanitizer all read from it — nothing here is duplicated into code or prompt strings.

The JSON below is canonical; create `content-config.json` from it verbatim. Field-by-field rationale (the *why* behind each value) lives in `specs/learner-profiles.md`; this doc is the *what*.

## content-config.json

```json
{
  "levels": {
    "early_learner": {
      "label": "Early Learner (Ages 3-5)",
      "age_range": [3, 5],
      "delivery": "read_aloud_by_caregiver",
      "readability_fk": [0, 1],
      "vocabulary": "500-1000 most common words; concrete nouns and simple verbs",
      "sentence_words": [3, 6],
      "concepts_per_section": 1,
      "analogy_density": "none_use_direct_concrete_examples",
      "abstraction": "none",
      "assumed_knowledge": "everyday objects, family, animals, basic colours/counting",
      "tone": "warm, playful, repetitive, question-driven",
      "baseline_word_count": [50, 150],
      "concept_cap": 4,
      "avoid": ["abstraction", "multi-step logic", "jargon", "long time spans"],
      "audience_mindset": "A pre-reader. This is a script an adult reads aloud while pointing at pictures. Wonder and repetition matter more than information density — one idea, felt rather than explained."
    },
    "young_child": {
      "label": "Young Child (Ages 6-10)",
      "age_range": [6, 10],
      "delivery": "independent_or_shared_reading",
      "readability_fk": [1, 4],
      "vocabulary": "common words; define new words inline with concrete examples",
      "sentence_words": [8, 12],
      "concepts_per_section": 1,
      "analogy_density": "high_everyday",
      "abstraction": "concrete_with_mild_anchored_abstraction",
      "assumed_knowledge": "basic arithmetic, everyday phenomena",
      "tone": "curious, encouraging, second person",
      "baseline_word_count": [150, 400],
      "concept_cap": 6,
      "avoid": ["undefined jargon", "nested clauses", "abstract-only explanation"],
      "audience_mindset": "Just gaining reading independence. Anchor every new idea to something in their own daily world. Curiosity is the engine: make them want to know what comes next."
    },
    "middle_schooler": {
      "label": "Middle Schooler (Ages 11-13)",
      "age_range": [11, 13],
      "delivery": "independent_reading",
      "readability_fk": [5, 7],
      "vocabulary": "domain terms okay if defined on first use",
      "sentence_words": [12, 18],
      "concepts_per_section": 2,
      "analogy_density": "moderate",
      "abstraction": "comfortable_with_concrete_touchstone",
      "assumed_knowledge": "basic math, intro science, some critical thinking",
      "tone": "respectful, engaging, never condescending",
      "baseline_word_count": [300, 600],
      "concept_cap": 9,
      "avoid": ["childish framing", "patronizing oversimplification"],
      "audience_mindset": "Capable of real abstraction and highly alert to condescension. Respect their intelligence — the failure mode at this age is talking down, not over-complexity."
    },
    "high_schooler": {
      "label": "High Schooler (Ages 14-18)",
      "age_range": [14, 18],
      "delivery": "independent_reading",
      "readability_fk": [8, 11],
      "vocabulary": "domain terminology, defined on first use",
      "sentence_words": [15, 25],
      "concepts_per_section": 3,
      "analogy_density": "low",
      "abstraction": "full_analogies_for_hard_ideas_only",
      "assumed_knowledge": "algebra, foundational sciences, structured reasoning",
      "tone": "intellectually engaging, near-peer, nuance welcome",
      "baseline_word_count": [500, 900],
      "concept_cap": 14,
      "avoid": ["over-explaining basics", "flattening real complexity"],
      "audience_mindset": "Near-adult reasoning. They can hold nuance and competing views. Engage them as thinkers, not as passive receivers of facts."
    },
    "adult_beginner": {
      "label": "Adult Beginner",
      "age_range": null,
      "delivery": "independent_reading",
      "readability_fk": [8, 10],
      "vocabulary": "define all domain jargon; everyday adult language otherwise",
      "sentence_words": [12, 22],
      "concepts_per_section": 2,
      "analogy_density": "moderate_adult_experience_based",
      "abstraction": "full_one_layer_at_a_time",
      "assumed_knowledge": "general adult life experience only; nothing field-specific",
      "tone": "knowledgeable peer, respectful, never patronizing",
      "baseline_word_count": [500, 900],
      "concept_cap": 12,
      "avoid": ["unexplained jargon", "assuming prior exposure", "condescension"],
      "audience_mindset": "A fully capable adult reasoner with ZERO knowledge of this topic. The gap is domain knowledge, not intelligence. Never condescend and never use childish analogies — but never assume prior exposure either. Anchor to common adult experience (work, money, driving, cooking)."
    },
    "adult_intermediate": {
      "label": "Adult Intermediate",
      "age_range": null,
      "delivery": "independent_reading",
      "readability_fk": [10, 12],
      "vocabulary": "field terminology free; define only genuinely novel terms",
      "sentence_words": [15, 30],
      "concepts_per_section": 4,
      "analogy_density": "sparse_novel_ideas_only",
      "abstraction": "high_assumes_fundamentals",
      "assumed_knowledge": "fundamentals of the field",
      "tone": "peer-to-peer, practical, includes trade-offs and comparisons",
      "baseline_word_count": [700, 1200],
      "concept_cap": 20,
      "avoid": ["re-teaching fundamentals", "basic analogies"],
      "audience_mindset": "Has the fundamentals and wants to deepen and connect. Do not re-teach basics. The value you add is nuance, trade-offs, and how the pieces fit together."
    },
    "adult_advanced": {
      "label": "Adult Advanced",
      "age_range": null,
      "delivery": "independent_reading",
      "readability_fk": [13, 18],
      "vocabulary": "full terminology, no definitions of standard terms",
      "sentence_words": [15, 40],
      "concepts_per_section": 5,
      "analogy_density": "rare_frontier_or_cross_domain_only",
      "abstraction": "maximal_assumes_deep_field_knowledge",
      "assumed_knowledge": "field internals, current standard practice",
      "tone": "precise, rigorous, peer; engages controversy and open problems",
      "baseline_word_count": [900, 2000],
      "concept_cap": null,
      "avoid": ["explaining known basics", "time-wasting hedging"],
      "audience_mindset": "An expert or near-expert. Over-explanation is insulting; precision and density are the value. Engage with edge cases, tensions, and open questions."
    }
  },

  "coverage": {
    "overview":      { "length_multiplier": 0.5, "concept_fraction": 0.4, "scope": "1-2 core ideas plus why it matters; no edge cases or mechanism detail" },
    "balanced":      { "length_multiplier": 1.0, "concept_fraction": 0.7, "scope": "core concepts plus key support plus 1-2 examples; minimal edge cases" },
    "comprehensive": { "length_multiplier": 1.9, "concept_fraction": 1.0, "scope": "core plus nuance, edge cases, exceptions, connections, mechanism — bounded by the level concept cap" }
  },

  "advanced_concept_demand": { "overview": 8, "balanced": 14, "comprehensive": 22 },

  "image_policy": {
    "early_learner":      { "posture": "leading",      "min_relevance": 0.30, "position": "before", "max_images": 2 },
    "young_child":        { "posture": "integrated",   "min_relevance": 0.40, "position": "after",  "max_images": 2 },
    "middle_schooler":    { "posture": "supportive",   "min_relevance": 0.50, "position": "after",  "max_images": 2 },
    "high_schooler":      { "posture": "supportive",   "min_relevance": 0.60, "position": "after",  "max_images": 2 },
    "adult_beginner":     { "posture": "supportive",   "min_relevance": 0.60, "position": "after",  "max_images": 2 },
    "adult_intermediate": { "posture": "sparing",      "min_relevance": 0.70, "position": "after",  "max_images": 2 },
    "adult_advanced":     { "posture": "diagram_only", "min_relevance": 0.80, "position": "after",  "max_images": 2 }
  },

  "posture_explanation": {
    "leading":      "The image carries the meaning; the words support it. Favour placing both images.",
    "integrated":   "Place each image right next to the concept it shows; generous use helps.",
    "supportive":   "Place an image where it clarifies a specific concept; do not place it just because one exists.",
    "sparing":      "Only place an image for an idea that genuinely benefits from a visual; prefer fewer.",
    "diagram_only": "Place only if the illustration is a true diagram or structure that conveys something prose can't. Otherwise omit."
  },

  "caption_guidance": {
    "early_learner":      "one short, concrete spoken line a caregiver can read aloud",
    "young_child":        "one simple sentence naming what's shown",
    "middle_schooler":    "a short caption linking the image to the concept",
    "high_schooler":      "a precise caption stating what the image conveys",
    "adult_beginner":     "a clear caption that orients a newcomer",
    "adult_intermediate": "a concise, informative caption",
    "adult_advanced":     "a precise technical label / figure caption"
  },

  "html_allowed_tags": ["h1","h2","h3","p","ul","ol","li","strong","em","blockquote","code","pre","table","thead","tbody","tr","th","td"],

  "content_types": {
    "conceptual": {
      "label": "conceptual",
      "building_blocks": ["a hook that gives a reason to care", "a clear explanation of each idea", "one or two concrete examples", "a short recap"],
      "generator_directives": "Explain ideas in prose. Lead with why the idea matters, then unfold it. This is the default narrative lesson.",
      "extra_tags": [],
      "extra_attrs": {},
      "review_checks": []
    },
    "coding": {
      "label": "coding",
      "requires": ["code_language"],
      "building_blocks": ["the concept in plain language", "a self-contained, runnable code example", "the expected output", "one common pitfall or mistake", "a small practice task for the reader"],
      "generator_directives": "Teach by showing working {{code_language}} code. Every example must be self-contained and runnable as shown — no '...' placeholders or undefined names. State the expected output after any example that prints. Match code complexity and idiom to the level (heavily commented and minimal for younger/beginner; idiomatic with edge cases for advanced).",
      "extra_tags": [],
      "extra_attrs": { "code": ["class"] },
      "code_class_pattern": "^language-[a-z0-9+#-]+$",
      "review_checks": ["code_self_contained: every example runs as shown, no placeholders or undefined names", "language_valid: code is valid {{code_language}}", "output_claims: stated outputs are plausible for the code", "complexity_fit: code complexity matches the level"]
    },
    "mathematical": {
      "label": "mathematical",
      "building_blocks": ["the rule, definition, or theorem", "notation with every symbol defined", "a worked example shown one step per line", "a practice problem"],
      "generator_directives": "Use LaTeX math: inline as \\( … \\) and display equations as $$ … $$. Define every symbol on first use. Show worked examples one step per line, each following from the last. Match rigor to the level (intuition and pictures for younger/beginner; formal derivations for advanced).",
      "extra_tags": [],
      "extra_attrs": {},
      "render": "katex",
      "review_checks": ["notation_defined: every symbol is introduced before use", "steps_follow: each derivation step follows from the previous", "delimiters_valid: math uses \\( \\) or $$ $$ and is well-formed LaTeX"]
    },
    "procedural": {
      "label": "procedural",
      "building_blocks": ["the goal / end result", "prerequisites or materials", "ordered steps (one action each)", "checkpoints or warnings where things go wrong", "how to know it worked"],
      "generator_directives": "Teach a process. State the goal and prerequisites first, then numbered steps in a single <ol>, one action per step. Use <blockquote> for common-failure warnings. Match detail to the level.",
      "extra_tags": [],
      "extra_attrs": {},
      "review_checks": ["steps_ordered: steps are complete and in the correct order", "prereqs_stated: prerequisites are listed before the steps"]
    }
  },

  "guide_thumbnail": {
    "style": "flat vector illustration with thin dark slate outlines and soft pastel fills, a small recognizable scene of a few related objects, friendly modern editorial look on a warm cream paper background",
    "max_elements": 6,
    "palette": [
      { "id": "cream-blue",       "background": "warm cream paper", "accent": "soft cornflower blue" },
      { "id": "cream-green",      "background": "warm cream paper", "accent": "fresh sage green" },
      { "id": "cream-amber",      "background": "warm cream paper", "accent": "warm amber" },
      { "id": "cream-teal",       "background": "warm cream paper", "accent": "calm teal" },
      { "id": "cream-coral",      "background": "warm cream paper", "accent": "muted coral" },
      { "id": "cream-lavender",   "background": "warm cream paper", "accent": "soft lavender" },
      { "id": "cream-rose",       "background": "warm cream paper", "accent": "dusty rose" },
      { "id": "cream-indigo",     "background": "warm cream paper", "accent": "deep indigo" },
      { "id": "cream-terracotta", "background": "warm cream paper", "accent": "warm terracotta" },
      { "id": "cream-plum",       "background": "warm cream paper", "accent": "muted plum" }
    ]
  }
}
```

> **`guide_thumbnail`** drives guide-card cover art (a flat-vector *thumbnail*, not an illustration). The flat-vector / cream-paper style intentionally matches the app's in-lesson house illustrations (thin slate outlines, soft pastel fills) so the dashboard reads as one family. The LLM derives a per-guide `{ metaphor, paletteId }` — `metaphor` here is a concrete, instantly recognizable depiction of the topic (a small scene of a few related objects), not an abstract symbol. `paletteId` must be one of the `palette[].id` values, which the prompt builder resolves to its `background`/`accent` colour words. `max_elements` caps how many shapes the scene may use (kept modest so cards stay uncluttered). The background is a consistent warm cream across all palettes; the `accent` is only a *gentle* lean — concrete scenes are naturally multi-colour (a sun is yellow, water blue), so the subject carries most of the colour and cards stay calm and legible (thin dark outlines survive on cream) against the white guide cards and green footer. Keep new entries on the cream background with a single brand-pastel accent.

> **Adding a content type** is a config-only change: add an entry here with its building blocks, directives, format additions, and review checks — no prompt or code edits. **Mixing types** (e.g. data-science = code + math) is not built yet but is a clean extension: union the two types' `extra_tags`/`extra_attrs` and directives at resolve time.

## Resolve logic

How runtime inputs become the derived slots. Implement in `prompts/slots.ts`.

```ts
function budget(level: LevelProfile, coverageId: CoverageId, cfg: ContentConfig): number {
  if (level.concept_cap == null) {
    return cfg.advanced_concept_demand[coverageId];          // adult_advanced: topic-driven
  }
  return Math.round(level.concept_cap * cfg.coverage[coverageId].concept_fraction);
}

function wordTarget(level: LevelProfile, coverageId: CoverageId, cfg: ContentConfig): [number, number] {
  const m = cfg.coverage[coverageId].length_multiplier;
  const [lo, hi] = level.baseline_word_count;
  return [Math.round(lo * m), Math.round(hi * m)];
}

function illustrationsBlock(imgs: Illustration[], maxImages: number): string {
  return imgs.slice(0, maxImages)
    .map(i => `IMAGE_${i.id}: ${i.prompt}`)
    .join("\n");
}

// content-type resolution: tags, attrs, and the prompt-injected strings
function resolvedTags(cfg: ContentConfig, type: ContentType): string[] {
  return [...cfg.html_allowed_tags, ...(type.extra_tags ?? [])];
}
function fillSlots(s: string, ctx: { code_language?: string }): string {
  return s.replace(/\{\{code_language\}\}/g, ctx.code_language ?? "");
}
// generator_directives and review_checks may contain {{code_language}}; fill them at resolve time.
```

`resolve()` then maps config fields → `Slots` (see `ARCHITECTURE.md` for the `Slots` shape):
- direct copies: `level_label`, `audience_mindset`, `vocabulary`, `abstraction`, `analogy_density`, `assumed_knowledge`, `tone`, `concepts_per_section`, `coverage_scope`.
- destructured pairs: `readability_fk → fk_min/fk_max`, `sentence_words → sentence_min/sentence_max`, word target → `word_min/word_max`.
- joined: `avoid_list = level.avoid.join("; ")`.
- derived: `concept_budget = budget(...)`, `illustrations_block`.
- from image policy / maps: `posture`, `max_images`, `posture_explanation[posture]`, `caption_guidance[levelId]`.
- from content type (`type = content_types[contentType]`):
  - `content_type_label = type.label`
  - `building_blocks = type.building_blocks.join("; ")`
  - `content_directives = fillSlots(type.generator_directives, { code_language })`
  - `type_review_checks = type.review_checks.map(c => fillSlots(c, { code_language })).join("; ")`
  - `format_conventions` = the task-prompt bullets for this type (see the format-conventions block in `specs/generation-review-prompts.md`); empty string for `conceptual`.
  - `allowed_tags = resolvedTags(cfg, type)` and `allowed_tags_inline = allowed_tags.map(t => "<"+t+">").join(" ")`.
- `code_language` passed through from runtime input (required when `contentType === "coding"`).

`allowed_tags` is passed to both the generator prompt fragment and the sanitizer, so they never drift.

## Worked examples

| level / coverage | concept_budget | word band |
|---|---|---|
| `middle_schooler` / `overview` | round(9 × 0.4) = **4** | round([300,600]×0.5) = **[150, 300]** |
| `middle_schooler` / `comprehensive` | round(9 × 1.0) = **9** | round([300,600]×1.9) = **[570, 1140]** |
| `adult_beginner` / `balanced` | round(12 × 0.7) = **8** | [500, 900] |
| `adult_advanced` / `comprehensive` | demand table → **22** | round([900,2000]×1.9) = **[1710, 3800]** |
| `early_learner` / `balanced` | round(4 × 0.7) = **3** | [50, 150] |

## Validation rules (`load.ts`)

Throw on load if any of:
- a `LevelId` is missing from `levels`, `image_policy`, or `caption_guidance`.
- `html_allowed_tags` is empty.
- any `length_multiplier` or `concept_fraction` ≤ 0.
- a `posture` value has no entry in `posture_explanation`.
- `content_types` is missing any referenced type, or a type lists a `requires` field with no runtime value supplied (checked at resolve, not load — e.g. `coding` without `code_language`).

## Tag allow-list note

`html_allowed_tags` is the **base** generator set; the resolved set for a lesson is base + the content type's `extra_tags` (and `extra_attrs`, e.g. `class` on `<code>` for `coding`, constrained to `code_class_pattern`). The **sanitizer** allow-list is the resolved set **plus** `figure`, `img`, `figcaption` (and `img`'s `src`/`alt`), because those are added at insertion. Build the sanitizer per-lesson from `slots.allowed_tags`; keep the figure-family superset in `sanitize.ts` as a clearly-commented addition, not in the JSON, so the generator is never told it may emit raw `<img>`. For `coding`, the sanitizer must also allow `class` on `<code>` matching `code_class_pattern`, or syntax highlighting silently breaks.