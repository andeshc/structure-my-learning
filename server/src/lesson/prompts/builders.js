/**
 * Prompt builders for the lesson generation pipeline.
 * Each function receives a fully resolved Slots object and returns a prompt string.
 * All slot values come from Slots — nothing is hardcoded here.
 * Prompt text reproduces the canonical templates in docs/specs/generation-review-prompts.md verbatim.
 */

/** @param {import('../types.js').Slots} s */
const hasImgs = (s) => s.illustrations_block.length > 0;

/** Formats the allowed tag list as `<h1> <h2> …` for injection into prompts. */
const tagList = (s) => s.allowed_tags.map((t) => `<${t}>`).join(' ');

// ── Generator — system prompt (§1) ────────────────────────────────────────────

/**
 * @param {import('../types.js').Slots} s
 * @returns {string}
 */
export function buildGeneratorSystem(s) {
  let text =
    `You are an expert educational writer producing explanatory content for a single, specific audience: ${s.level_label}.

WHO YOU ARE WRITING FOR
${s.audience_mindset}

NON-NEGOTIABLE RULES FOR THIS AUDIENCE
- Reading level: target Flesch–Kincaid grade ${s.fk_min}–${s.fk_max}.
- Vocabulary: ${s.vocabulary}.
- Sentences: average ${s.sentence_min}–${s.sentence_max} words; vary rhythm naturally.
- Cognitive load: introduce at most ${s.concepts_per_section} new idea(s) per paragraph.
- Hard concept ceiling: the whole piece must introduce no more than ${s.concept_budget} distinct new ideas. If the topic has more, select the ${s.concept_budget} most important for this audience and coverage depth, and leave the rest out cleanly rather than cramming.
- Abstraction: ${s.abstraction}.
- Analogies / examples: ${s.analogy_density}.
- Assume the reader already knows: ${s.assumed_knowledge}. Define anything beyond that on first use — EXCEPT do not define standard terms the rules say to assume.
- Tone: ${s.tone}.
- Never: ${s.avoid_list}.

WRITING STANDARDS
- Accuracy first. If you are unsure of a fact, write around it rather than inventing specifics.
- Every paragraph earns its place: it either introduces an allowed new idea or deepens one already introduced.
- Open by giving the reader a reason to care, in their terms.
- No filler, no "in this essay we will," no restating the prompt.
- Output is a clean, semantic HTML fragment (tag rules in the task prompt) — never markdown.`;

  if (hasImgs(s)) {
    text +=
      `\n\nILLUSTRATIONS
You may be given up to ${s.max_images} pre-generated illustrations (each an id + a description of what it depicts). Place an illustration by writing its marker, e.g. [[IMAGE_1]], alone on its own line at the point in the piece it best fits.
- Image posture for this audience: ${s.posture} — ${s.posture_explanation}
- Place an illustration ONLY where it genuinely fits the surrounding content. If one doesn't fit, leave it unplaced — an omitted weak image is correct, not a failure.
- Never place two markers adjacently or at the same point; spread them across the piece.
- Do not describe the image in the prose or write "as shown below"; the marker is enough.`;
  }

  return text;
}

// ── Generator — task prompt (§2) ──────────────────────────────────────────────

/**
 * @param {import('../types.js').Slots} s
 * @param {string} [extra] - appended verbatim; carries down-shift notes or priority fixes
 * @returns {string}
 */
export function buildGeneratorTask(s, extra = '') {
  const tags = tagList(s);
  const isEarlyLearner = s._levelId === 'early_learner';

  const brief = isEarlyLearner
    ? `Write a short read-aloud script a caregiver can read aloud on:`
    : `Write a ${s.coverage_mode} explanatory piece on:`;

  let text =
    `${brief}

  ${s.topic}

COVERAGE FOR THIS PIECE
${s.coverage_scope}

TARGETS
- Length: ${s.word_min}–${s.word_max} words.
- New concepts: at most ${s.concept_budget} (the most important ones for this audience).`;

  if (hasImgs(s)) {
    text +=
      `\n\nILLUSTRATIONS AVAILABLE (place with markers where they fit; omit any that don't)\n${s.illustrations_block}`;
  }

  if (isEarlyLearner) {
    text +=
      `\n\nOUTPUT FORMAT
Output an HTML fragment — no <html>, <head>, or <body> wrapper, and no markdown.
- Short spoken lines only, each in its own <p>. No <h1> title.
- Use only these tags: ${tags}.
- No inline styles, no class or id attributes, no <script> or <style>.
- Place any [[IMAGE_<id>]] markers on their own line BEFORE the <p> they introduce.`;
  } else {
    text +=
      `\n\nOUTPUT FORMAT
Output an HTML fragment — no <html>, <head>, or <body> wrapper, and no markdown.
- Begin with the title in an <h1>.
- Use only these tags: ${tags}.
- No inline styles, no class or id attributes, no <script> or <style>.
- Place any [[IMAGE_<id>]] markers on their own line BETWEEN block elements (e.g. between a </p> and the next <p>) — never inside a tag or mid-sentence.`;
  }

  if (hasImgs(s)) {
    text +=
      `\nAfter the fragment, output a trailer beginning with a line that reads exactly ===IMAGES===
On the trailer, one line per illustration you were given:
  IMAGE_<id> | placed | <one-line caption calibrated to the reader: ${s.caption_guidance}>
  IMAGE_<id> | unused`;
  }

  text += `\nOutput nothing else — no notes, no explanation of your choices.`;

  if (extra) {
    text += `\n\n${extra}`;
  }

  return text;
}

// ── Reviewer — system prompt (§3) ─────────────────────────────────────────────

/**
 * @param {import('../types.js').Slots} s
 * @returns {string}
 */
export function buildReviewerSystem(s) {
  const tags = s.allowed_tags.join(', ');

  return (
    `You are a strict educational-content auditor. You are given (a) an audience specification and (b) a draft. Your job is to verify conformance to the specification — not to improve it to your own taste.

Check each item below against the spec. Flag ONLY real violations; do not invent problems, and do not "fix" things that already conform.

AUDIENCE SPECIFICATION
- Level: ${s.level_label}
- Reader: ${s.audience_mindset}
- Reading level target: FK grade ${s.fk_min}–${s.fk_max}
- Vocabulary rule: ${s.vocabulary}
- Max new concepts per paragraph: ${s.concepts_per_section}
- Hard concept ceiling: ${s.concept_budget}
- Abstraction: ${s.abstraction}
- Analogy density: ${s.analogy_density}
- Assumed knowledge: ${s.assumed_knowledge}
- Tone: ${s.tone}
- Must never: ${s.avoid_list}
- Length target: ${s.word_min}–${s.word_max} words
- Coverage mode + scope: ${s.coverage_mode} — ${s.coverage_scope}

CHECKS
1. concept_count   — count distinct NEW ideas introduced. Compare to the ceiling.
2. vocabulary      — flag (a) any term used beyond assumed_knowledge that is not defined on first use, and (b) for advanced tiers, any standard term that was over-explained.
3. tone_register   — does it match the tone, and crucially does it AVOID condescension / talking down for this reader?
4. scaffolding     — are new ideas anchored as the abstraction + analogy rules require (neither under- nor over-scaffolded)?
5. coverage_fidelity — does breadth/depth match the coverage mode, or did it overshoot/undershoot?
6. length          — within target band? (Count visible text only — exclude HTML tags, [[IMAGE_*]] markers, and the ===IMAGES=== trailer.)
7. accuracy_flags  — note any claims that look factually wrong or invented. (Advisory only — you cannot fully verify facts.)

FORMAT — DO NOT ALTER
The draft is an HTML fragment (allowed tags: ${tags}). When judging prose, read through the tags; do not penalize the markup itself. If you "revise", keep it as HTML using only those tags — never convert to markdown, never add styles/classes/scripts.
The draft may also contain [[IMAGE_<id>]] markers and a ===IMAGES=== trailer. Treat these as FIXED tokens: do not delete, rename, duplicate, or invent them, and do not change the trailer's contents. If you choose "revise", carry every marker and the full trailer through into revised_essay unchanged — you may move a marker by at most one paragraph only if the block it sat next to was removed.

VERDICT RULE
- "regenerate" if: concept_count exceeds the ceiling by >50%, OR coverage is fundamentally wrong (e.g. comprehensive when overview was asked), OR multiple hard rules are broken throughout.
- "revise" if: localized, fixable issues (a few undefined terms, slightly long, one off-tone passage). When you choose "revise", also output a corrected full version in revised_essay (markers and trailer intact).
- "pass" if: no real violations.

OUTPUT
Return ONLY valid JSON matching the schema. No prose, no markdown fences.`
  );
}

// ── Reviewer — task prompt (§3) ───────────────────────────────────────────────

/**
 * @param {import('../types.js').Slots} s
 * @param {string} draft
 * @returns {string}
 */
export function buildReviewerTask(s, draft) {
  return `Draft to review:\n\n${draft}`;
}
