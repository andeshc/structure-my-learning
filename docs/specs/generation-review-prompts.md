# Generation + Review Prompt Templates

Consumes `learner-profiles.md` config, the `image_policy` / `caption_guidance` maps from `image-placement.md`, and the `content_types` map from `CONFIG.md`. Two LLM calls (generate, review) plus deterministic gates (readability; optional code-execution for `coding` content). **The generator outputs an HTML fragment, not markdown.** Three axes drive it: **level** (how to communicate), **coverage** (how much), and **content_type** (what kind of content — `conceptual` / `coding` / `mathematical` / `procedural` — which sets the building blocks, output format, and review checks). Illustration placement is folded into generation (option 1): the generator drops `[[IMAGE_<id>]]` markers between block elements and a deterministic step swaps each for a `<figure>`. Placeholders use `{{mustache}}` syntax and map to the config fields noted in the variable reference at the end.

---

## Pipeline overview

```
topic + level + coverage + content_type (+ code_language) + up to 2 illustration prompts
        │
        ▼
[ resolve ]  concept_budget = budget(level, coverage)   (see CONFIG.md)
             word_target    = level.baseline_word_count × coverage.length_multiplier
             load image_policy[level] and content_types[content_type]
             allowed_tags   = base + content_type.extra_tags
        │
        ▼
[ GENERATE ]  call 1  →  draft lesson WITH [[IMAGE_id]] markers + ===IMAGES=== trailer
        │
        ▼
[ FK GATE ]   deterministic  (younger tiers only — FK saturates for adults)
        │           ├─ fail → down-shift, regenerate (≤2)
        ▼           └─ pass ↓
[ CODE GATE ] deterministic  (coding content + sandboxable language only)
        │           ├─ error → append error, regenerate (≤2)
        ▼           └─ pass ↓
[ REVIEW ]    call 2  →  verdict + type_specific checks; markers preserved
        │
        ├─ pass / revise / regenerate  → essay
        ▼
[ INSERT ]    deterministic  →  swap [[IMAGE_id]] for <figure>, strip trailer
        ▼
[ SANITIZE ]  deterministic  →  allow-list (resolved tags + figure family) → final lesson HTML
```

The review checks *conformance to explicit parameters*, not taste — that's what makes self-review reliable here. The readability gate is fully deterministic so it never depends on the model's self-assessment.

---

## Recommended config addition: `audience_mindset`

Add one string per level. Injected into the generator (and reviewer) as framing.

```json
{
  "early_learner":      "A pre-reader. This is a script an adult reads aloud while pointing at pictures. Wonder and repetition matter more than information density — one idea, felt rather than explained.",
  "young_child":        "Just gaining reading independence. Anchor every new idea to something in their own daily world. Curiosity is the engine: make them want to know what comes next.",
  "middle_schooler":    "Capable of real abstraction and highly alert to condescension. Respect their intelligence — the failure mode at this age is talking down, not over-complexity.",
  "high_schooler":      "Near-adult reasoning. They can hold nuance and competing views. Engage them as thinkers, not as passive receivers of facts.",
  "adult_beginner":     "A fully capable adult reasoner with ZERO knowledge of this topic. The gap is domain knowledge, not intelligence. Never condescend and never use childish analogies — but never assume prior exposure either. Anchor to common adult experience (work, money, driving, cooking).",
  "adult_intermediate": "Has the fundamentals and wants to deepen and connect. Do not re-teach basics. The value you add is nuance, trade-offs, and how the pieces fit together.",
  "adult_advanced":     "An expert or near-expert. Over-explanation is insulting; precision and density are the value. Engage with edge cases, tensions, and open questions."
}
```

---

## 1. Generator — system prompt

```
You are an expert educational author producing a lesson for a single, specific audience: {{level_label}}.

WHO YOU ARE WRITING FOR
{{audience_mindset}}

NON-NEGOTIABLE RULES FOR THIS AUDIENCE
- Reading level: target Flesch–Kincaid grade {{fk_min}}–{{fk_max}}.
- Vocabulary: {{vocabulary}}.
- Sentences: average {{sentence_min}}–{{sentence_max}} words; vary rhythm naturally.
- Cognitive load: introduce at most {{concepts_per_section}} new idea(s) per section.
- Hard concept ceiling: the whole lesson must introduce no more than {{concept_budget}} distinct new ideas. If the topic has more, select the {{concept_budget}} most important for this audience and coverage depth, and leave the rest out cleanly rather than cramming.
- Abstraction: {{abstraction}}.
- Analogies / examples: {{analogy_density}}.
- Assume the reader already knows: {{assumed_knowledge}}. Define anything beyond that on first use — EXCEPT do not define standard terms the rules say to assume.
- Tone: {{tone}}.
- Never: {{avoid_list}}.

CONTENT TYPE — {{content_type_label}}
Build the lesson from these blocks (adapt count/depth to the coverage and concept ceiling): {{building_blocks}}.
{{content_directives}}
All content-type elements still obey the audience rules above — calibrate code complexity, mathematical rigor, or step detail to {{level_label}}.

WRITING STANDARDS
- Accuracy first. If you are unsure of a fact, write around it rather than inventing specifics. Never present unverified code or math as correct.
- Every section earns its place: it either introduces an allowed new idea or deepens one already introduced.
- Open by giving the reader a reason to care, in their terms.
- No filler, no "in this lesson we will," no restating the prompt.
- Output is a clean, semantic HTML fragment (tag rules in the task prompt) — never markdown.

ILLUSTRATIONS
You may be given up to {{max_images}} pre-generated illustrations (each an id + a description of what it depicts). Place an illustration by writing its marker, e.g. [[IMAGE_1]], alone on its own line at the point in the lesson it best fits.
- Image posture for this audience: {{posture}} — {{posture_explanation}}
- Place an illustration ONLY where it genuinely fits the surrounding content. If one doesn't fit, leave it unplaced — an omitted weak image is correct, not a failure.
- Never place two markers adjacently or at the same point; spread them across the lesson.
- Do not describe the image in the prose or write "as shown below"; the marker is enough.
```

## 2. Generator — task prompt

```
Write a {{coverage_mode}} {{content_type_label}} lesson on:

  {{topic}}

COVERAGE FOR THIS LESSON
{{coverage_scope}}

TARGETS
- Length: {{word_min}}–{{word_max}} words (counting prose; code and equations don't count toward this).
- New concepts: at most {{concept_budget}} (the most important ones for this audience).

ILLUSTRATIONS AVAILABLE (place with markers where they fit; omit any that don't)
{{illustrations_block}}

OUTPUT FORMAT
Output an HTML fragment — no <html>, <head>, or <body> wrapper, and no markdown.
- Begin with the title in an <h1>.
- Use only these tags: {{allowed_tags_inline}}.
- No inline styles, no id attributes, no <script> or <style>.
{{format_conventions}}
- Place any [[IMAGE_<id>]] markers on their own line BETWEEN block elements (e.g. between a </p> and the next <p>) — never inside a tag or mid-sentence.
After the fragment, output a trailer beginning with a line that reads exactly ===IMAGES===
On the trailer, one line per illustration you were given:
  IMAGE_<id> | placed | <one-line caption calibrated to the reader: {{caption_guidance}}>
  IMAGE_<id> | unused
Output nothing else — no notes, no explanation of your choices.
```

`{{allowed_tags_inline}}` is the resolved tag set for this content type (base list + the content type's `extra_tags`), e.g. base only for `conceptual`, or base for `coding` since code uses `<pre><code class="language-…">`. `{{format_conventions}}` is the content type's format guidance, injected as extra bullet lines — empty for `conceptual`, and for the others:

```
# coding
- Put every code example in <pre><code class="language-{{code_language}}">…</code></pre> with the code HTML-escaped (&lt; &gt; &amp;). No other class attributes anywhere.
- Code must be self-contained and runnable as shown — no "..." placeholders or undefined names. After an example that prints output, state the expected output in a <p> or as a comment.

# mathematical
- Write inline math as \( … \) and display equations as $$ … $$ (LaTeX). Do not wrap math in tags or images.
- Define every symbol on first use; show worked examples one step per line.

# procedural
- Put the ordered steps in a single <ol>; one action per <li>. Use <blockquote> for warnings or common-failure notes.
```

`{{illustrations_block}}` is a simple rendering of the prompts you were handed, e.g.:

```
IMAGE_1: A cross-section of a leaf showing chloroplasts catching sunlight.
IMAGE_2: A simple flow from sunlight + water + air to sugar + oxygen.
```

If no illustrations were passed for this topic, omit the ILLUSTRATIONS sections entirely and drop the trailer.

> For the **Early Learner** tier, swap the brief: a read-aloud script (50–150 words, short spoken lines each in its own `<p>`) rather than a titled essay. Markers still sit on their own line between blocks; with `leading` posture the marker precedes the `<p>` it belongs to.

---

## 3. Reviewer — system prompt

```
You are a strict educational-content auditor. You are given (a) an audience specification and (b) a draft. Your job is to verify conformance to the specification — not to improve it to your own taste.

Check each item below against the spec. Flag ONLY real violations; do not invent problems, and do not "fix" things that already conform.

AUDIENCE SPECIFICATION
- Level: {{level_label}}
- Reader: {{audience_mindset}}
- Reading level target: FK grade {{fk_min}}–{{fk_max}}
- Vocabulary rule: {{vocabulary}}
- Max new concepts per section: {{concepts_per_section}}
- Hard concept ceiling: {{concept_budget}}
- Abstraction: {{abstraction}}
- Analogy density: {{analogy_density}}
- Assumed knowledge: {{assumed_knowledge}}
- Tone: {{tone}}
- Must never: {{avoid_list}}
- Length target: {{word_min}}–{{word_max}} words
- Coverage mode + scope: {{coverage_mode}} — {{coverage_scope}}
- Content type: {{content_type_label}}

CHECKS
1. concept_count   — count distinct NEW ideas introduced. Compare to the ceiling.
2. vocabulary      — flag (a) any term used beyond assumed_knowledge that is not defined on first use, and (b) for advanced tiers, any standard term that was over-explained.
3. tone_register   — does it match the tone, and crucially does it AVOID condescension / talking down for this reader?
4. scaffolding     — are new ideas anchored as the abstraction + analogy rules require (neither under- nor over-scaffolded)?
5. coverage_fidelity — does breadth/depth match the coverage mode, or did it overshoot/undershoot?
6. length          — within target band? (Count prose only — exclude HTML tags, code, equations, [[IMAGE_*]] markers, and the ===IMAGES=== trailer.)
7. accuracy_flags  — note any claims that look factually wrong or invented. (Advisory only — you cannot fully verify facts.)
8. type_specific   — apply the checks for this content type: {{type_review_checks}}. Report each as pass/fail with a short note.

FORMAT — DO NOT ALTER
The draft is an HTML fragment using only the tags allowed for this content type ({{allowed_tags_inline}}), plus, for `coding`, a class="language-…" on <code>, and, for `mathematical`, LaTeX in \( \) / $$ $$ delimiters. When judging prose, read through the tags, code, and equations; do not penalize the markup. If you "revise", keep it as HTML using only those tags, keep code and equations intact and correct — never convert to markdown, never add styles/ids/scripts.
The draft may also contain [[IMAGE_<id>]] markers and a ===IMAGES=== trailer. Treat these as FIXED tokens: do not delete, rename, duplicate, or invent them, and do not change the trailer's contents. If you choose "revise", carry every marker and the full trailer through into revised_essay unchanged — you may move a marker by at most one section only if the block it sat next to was removed.

VERDICT RULE
- "regenerate" if: concept_count exceeds the ceiling by >50%, OR coverage is fundamentally wrong (e.g. comprehensive when overview was asked), OR multiple hard rules are broken throughout.
- "revise" if: localized, fixable issues (a few undefined terms, slightly long, one off-tone passage). When you choose "revise", also output a corrected full version in revised_essay (markers and trailer intact).
- "pass" if: no real violations.

OUTPUT
Return ONLY valid JSON matching the schema. No prose, no markdown fences.
```

## Review output schema

```json
{
  "verdict": "pass | revise | regenerate",
  "checks": {
    "concept_count":     { "found": 0, "ceiling": 0, "pass": true, "note": "" },
    "vocabulary":        { "pass": true, "violations": [] },
    "tone_register":     { "pass": true, "note": "" },
    "scaffolding":       { "pass": true, "note": "" },
    "coverage_fidelity": { "pass": true, "note": "" },
    "length":            { "found": 0, "target": [0, 0], "pass": true },
    "markers_preserved": { "pass": true, "note": "all [[IMAGE_*]] markers and trailer intact" },
    "type_specific":     { "pass": true, "results": [{ "check": "code_self_contained", "pass": true, "note": "" }] },
    "accuracy_flags":    []
  },
  "priority_fixes": ["ordered list of the most important changes, empty if pass"],
  "revised_essay": "full corrected text — present ONLY when verdict is 'revise'"
}
```

---

## 4. Deterministic readability gate (no LLM)

Run this between generate and review for the four younger tiers. It's cheap, objective, and catches the single most common miss (essay drifts above grade). Use any FK implementation — e.g. the `text-readability` npm package:

```ts
import rs from "text-readability";

function readabilityGate(text: string, fkMin: number, fkMax: number) {
  const grade = rs.fleschKincaidGrade(text);
  // allow a small margin; tighten as you like
  const pass = grade <= fkMax + 1.0;
  return { grade, pass };
}
```

If it fails, regenerate with an appended instruction like: *"The previous draft read at grade {{grade}}; rewrite at grade {{fk_max}} or below — shorter sentences, more common words, no new ideas added."* Cap retries at 1–2, then fall through to the review pass.

Skip this gate for `adult_intermediate` and `adult_advanced` — FK saturates and can't tell them apart. Those tiers rely on the reviewer's `vocabulary` check (define-vs-assume conformance) instead.

---

## 4b. Deterministic code-execution gate (no LLM, `coding` content only)

The strongest quality lever for code lessons, and the same pattern as the readability gate: a real check rather than model self-judgment. Only runs when `content_type === "coding"` and the language is executable in your sandbox (e.g. Python, JS).

```ts
function codeGate(draft: string, language: string, run: (code: string, lang: string) => RunResult) {
  // extract each <pre><code class="language-X">…</code></pre> block, HTML-unescape it
  const blocks = extractCodeBlocks(draft, language);
  for (const code of blocks) {
    const res = run(code, language);          // sandboxed; time + memory limited
    if (res.error) return { pass: false, code, error: res.error };
  }
  return { pass: true };
}
```

On failure, regenerate with the failing snippet and error appended: *"This example raised `{{error}}`; fix it so every example runs as shown."* Cap at 1–2 retries, then fall through to review (which still flags it via `type_specific`). Run blocks in an isolated, resource-limited sandbox with no network — generated code is untrusted. If you can't sandbox a given language, skip the gate and lean on the reviewer's `type_specific` check instead.

---

## 5. Orchestration (pseudocode)

```ts
async function generateLesson(
  topic: string, levelId: string, coverageId: string, contentType: string,
  opts: { codeLanguage?: string; illustrations?: { id: string; prompt: string; url: string }[] } = {}
) {
  const level = config.levels[levelId];
  const coverage = config.coverage[coverageId];
  const policy = config.image_policy[levelId];
  const ctype = config.content_types[contentType];

  // resolve derived targets  (budget() defined in CONFIG.md)
  const conceptBudget = budget(level, coverageId, config);
  const [wMin, wMax] = level.baseline_word_count.map(w =>
    Math.round(w * coverage.length_multiplier));

  const imgs = (opts.illustrations ?? []).slice(0, policy.max_images);
  const slots = buildSlots(level, coverage, policy, ctype, topic, conceptBudget,
                           wMin, wMax, imgs, opts.codeLanguage);

  let draft = await llm(genSystem(slots), genTask(slots));      // call 1 — emits markers + trailer

  // deterministic readability gate (younger tiers only)
  if (level.readability_fk[1] <= 12) {
    for (let i = 0; i < 2; i++) {
      const { grade, pass } = readabilityGate(stripForReadability(draft), ...level.readability_fk);
      if (pass) break;
      draft = await llm(genSystem(slots), downshiftTask(slots, grade));
    }
  }

  // deterministic code-execution gate (coding content with a sandboxable language)
  if (contentType === "coding" && isSandboxable(opts.codeLanguage)) {
    for (let i = 0; i < 2; i++) {
      const g = codeGate(draft, opts.codeLanguage!, runSandbox);
      if (g.pass) break;
      draft = await llm(genSystem(slots), fixCodeTask(slots, g.error));
    }
  }

  const review = JSON.parse(await llm(reviewSystem(slots), reviewTask(slots, draft))); // call 2

  let essay: string;
  switch (review.verdict) {
    case "pass":       essay = draft; break;
    case "revise":     essay = review.revised_essay; break;
    case "regenerate": essay = await llm(
                          genSystem(slots),
                          genTask(slots) + "\n\nAVOID THESE ISSUES:\n" +
                          review.priority_fixes.join("\n"));
                       break;
  }

  // deterministic insertion: swap markers for <figure>, strip trailer, then sanitize
  // sanitizer allow-list = resolved tags for this content type (+ figure family)
  return sanitizeHtml(insertImageMarkers(essay, imgs), slots.allowed_tags);
}
```

`stripForReadability()` removes the trailer, the `[[IMAGE_*]]` markers, and all HTML tags before the FK count so neither markup nor markers skew the grade. `insertImageMarkers()` parses the trailer for captions and swaps each marker for a `<figure>`:

```ts
const stripForReadability = (s: string) =>
  s.split(/^===IMAGES===$/m)[0]            // drop trailer
   .replace(/\[\[IMAGE_\w+\]\]/g, " ")     // drop markers
   .replace(/<[^>]+>/g, " ")               // drop HTML tags
   .replace(/\s+/g, " ").trim();

function insertImageMarkers(essay: string, imgs) {
  const [body, trailer = ""] = essay.split(/^===IMAGES===$/m);
  const caption: Record<string, string> = {};
  for (const line of trailer.trim().split("\n")) {
    const [id, status, cap] = line.split("|").map(s => s.trim());
    if (status === "placed" && cap) caption[id] = cap;
  }
  const urlOf = Object.fromEntries(imgs.map(i => [`IMAGE_${i.id}`, i.url]));
  return body.trim().replace(/^\s*\[\[(IMAGE_\w+)\]\]\s*$/gm, (_m, id) => {
    if (!urlOf[id]) return "";              // unplaced/dropped marker → removed
    const cap = caption[id];
    return `<figure><img src="${escapeAttr(urlOf[id])}" alt="${escapeAttr(cap ?? "")}">`
         + (cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : "")
         + `</figure>`;
  });
}
```

`sanitizeHtml()` is any allow-list sanitizer (e.g. `sanitize-html` / DOMPurify) pinned to the same tag set the generator was told to use. Run it even though the HTML is your own model's output — it's cheap insurance against a stray disallowed tag reaching the browser, and it's the natural place to enforce the tag allow-list deterministically rather than relying on the reviewer to police markup. `<figure>`, `<img>`, and `<figcaption>` must be on the sanitizer allow-list since insertion adds them after generation.

---

## Per-tier tuning notes

- **Early Learner** — the FK gate and `concept_count` check do most of the work; tone check is mostly "is this warm and concrete." Generator outputs a read-aloud script, not an essay.
- **Young Child / Middle Schooler** — FK gate is the hard gate. For Middle School, weight the `tone_register` check on *condescension* specifically.
- **High Schooler** — FK gate still applies but loosens; `coverage_fidelity` starts mattering more (they can be under-served by Overview).
- **Adult Beginner** — no FK gate. The two gates that matter: `vocabulary` (every domain term defined) and `tone_register` (zero condescension). This pairing is unique to this tier.
- **Adult Intermediate / Advanced** — no FK gate. The `vocabulary` check inverts: flag *over-explanation* of standard terms. `coverage_fidelity` and `accuracy_flags` carry the most weight.

---

## Variable reference

| Slot | Source |
|---|---|
| `{{level_label}}` | `level.label` |
| `{{audience_mindset}}` | `level.audience_mindset` (new field above) |
| `{{fk_min}}` / `{{fk_max}}` | `level.readability_fk` |
| `{{vocabulary}}` | `level.vocabulary` |
| `{{sentence_min}}` / `{{sentence_max}}` | `level.sentence_words` |
| `{{concepts_per_section}}` | `level.concepts_per_section` |
| `{{abstraction}}` | `level.abstraction` |
| `{{analogy_density}}` | `level.analogy_density` |
| `{{assumed_knowledge}}` | `level.assumed_knowledge` |
| `{{tone}}` | `level.tone` |
| `{{avoid_list}}` | `level.avoid` (joined) |
| `{{concept_budget}}` | `budget(level, coverage)` — see CONFIG.md |
| `{{word_min}}` / `{{word_max}}` | `level.baseline_word_count × coverage.length_multiplier` |
| `{{coverage_mode}}` | coverage key (overview/balanced/comprehensive) |
| `{{coverage_scope}}` | `coverage.scope` |
| `{{topic}}` | runtime input |
| `{{content_type_label}}` | `content_types[type].label` (from `CONFIG.md`) |
| `{{building_blocks}}` | `content_types[type].building_blocks` (joined) |
| `{{content_directives}}` | `content_types[type].generator_directives` (slots like `{{code_language}}` resolved) |
| `{{format_conventions}}` | content type's format bullets for the task prompt (empty for `conceptual`) |
| `{{type_review_checks}}` | `content_types[type].review_checks` (joined) |
| `{{allowed_tags_inline}}` | base `html_allowed_tags` + `content_types[type].extra_tags`, rendered as `<tag>` list |
| `{{code_language}}` | runtime input (required for `coding`) |
| `{{max_images}}` | `image_policy[level].max_images` (from `image-placement.md`) |
| `{{posture}}` | `image_policy[level].posture` |
| `{{posture_explanation}}` | `posture_explanation[posture]` (from `image-placement.md`) |
| `{{caption_guidance}}` | `caption_guidance[level]` (from `image-placement.md`) |
| `{{illustrations_block}}` | rendered `IMAGE_<id>: <prompt>` lines from the up-to-2 illustrations passed in |