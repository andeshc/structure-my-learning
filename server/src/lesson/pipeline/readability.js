/**
 * Deterministic readability utilities — no LLM calls.
 *
 * stripForReadability: drop the ===IMAGES=== trailer, [[IMAGE_*]] markers, and
 * all HTML tags so the Flesch–Kincaid grade reflects only the prose.
 *
 * readabilityGate: apply the FK gate as specified in generation-review-prompts.md §4.
 * The gate only checks the upper bound (fkMax + 1.0 margin); fkMin is accepted
 * in the signature for symmetry with the Slots shape but is not used.
 */

// ── Flesch–Kincaid helpers ────────────────────────────────────────────────────

/**
 * Syllable count approximation.
 * Good enough for the FK gate's purpose (rough grade-level discrimination);
 * not a precise linguistic counter.
 * @param {string} word
 * @returns {number}
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/e$/, '');  // silent trailing e
  const groups = word.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/**
 * @param {string} text - plain text (no HTML, no markers, no trailer)
 * @returns {number} Flesch–Kincaid grade level
 */
function fleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return 0;
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  return (
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Strip the ===IMAGES=== trailer, [[IMAGE_*]] markers, and all HTML tags,
 * then collapse whitespace. The resulting plain text is fed to the FK gate.
 *
 * Canonical implementation from generation-review-prompts.md §5.
 * @param {string} s
 * @returns {string}
 */
export const stripForReadability = (s) =>
  s.split(/^===IMAGES===$/m)[0]         // drop trailer
   .replace(/\[\[IMAGE_\w+\]\]/g, ' ')  // drop markers
   .replace(/<[^>]+>/g, ' ')            // drop HTML tags
   .replace(/\s+/g, ' ')
   .trim();

/**
 * Flesch–Kincaid readability gate.
 * Passes when grade ≤ fkMax + 1.0 (one-grade margin, as specified).
 * Skip this gate for adult_intermediate / adult_advanced — call it only when
 * level.readability_fk[1] <= 11 (see generateLesson orchestration).
 *
 * @param {string} text - plain text, already stripped by stripForReadability
 * @param {number} fkMin - lower FK target (not used in the pass/fail logic)
 * @param {number} fkMax - upper FK target; gate threshold is fkMax + 1.0
 * @returns {{ grade: number, pass: boolean }}
 */
export function readabilityGate(text, fkMin, fkMax) {
  const grade = fleschKincaidGrade(text);
  const pass = grade <= fkMax + 1.0;
  return { grade, pass };
}
