import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('./generate.js', () => ({ generate: vi.fn() }));
vi.mock('./review.js',   () => ({ review:   vi.fn() }));
vi.mock('./readability.js', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, readabilityGate: vi.fn() };
});

import { generate } from './generate.js';
import { review }   from './review.js';
import { readabilityGate } from './readability.js';
import { generateLesson } from './orchestrator.js';
import { loadConfig, _resetCache } from '../config/load.js';

const DRAFT   = '<p>Test lesson content about the topic.</p>';
const REVISED = '<p>Revised lesson content about the topic.</p>';
const REGEN   = '<p>Regenerated lesson content about the topic.</p>';

const FAKE_GEN_USAGE    = { inputTokens: 100, outputTokens: 200 };
const FAKE_REVIEW_USAGE = { inputTokens:  50, outputTokens:  80 };

const PASS_RESULT = {
  verdict: 'pass',
  checks: {
    markers_preserved: { pass: true },
    concept_count:     { found: 3, ceiling: 6, pass: true },
    vocabulary:        { pass: true, violations: [] },
    accuracy_flags:    [],
  },
  priority_fixes: [],
};

const REVISE_RESULT = {
  verdict: 'revise',
  checks: {
    markers_preserved: { pass: true },
    concept_count:     { found: 3, ceiling: 6, pass: true },
    vocabulary:        { pass: true, violations: [] },
    accuracy_flags:    [],
  },
  priority_fixes: ['Define "tectonics" on first use'],
  revised_essay: REVISED,
};

const REGEN_RESULT = {
  verdict: 'regenerate',
  checks: {
    markers_preserved: { pass: true },
    concept_count:     { found: 20, ceiling: 6, pass: false },
    vocabulary:        { pass: true, violations: [] },
    accuracy_flags:    [],
  },
  priority_fixes: ['Reduce concepts to ≤6', 'Expand to ≥300 words'],
};

const MARKERS_BAD_PASS = {
  verdict: 'pass',
  checks: {
    markers_preserved: { pass: false, note: 'marker removed' },
    concept_count:     { found: 3, ceiling: 6, pass: true },
    vocabulary:        { pass: true, violations: [] },
    accuracy_flags:    [],
  },
  priority_fixes: [],
};

const MARKERS_BAD_REVISE = {
  verdict: 'revise',
  checks: {
    markers_preserved: { pass: false, note: 'marker removed' },
    concept_count:     { found: 3, ceiling: 6, pass: true },
    vocabulary:        { pass: true, violations: [] },
    accuracy_flags:    [],
  },
  priority_fixes: ['fix vocab'],
  revised_essay: REVISED,
};

function genResult(text = DRAFT)    { return { text, usage: FAKE_GEN_USAGE }; }
function revResult(reviewResult)    { return { result: reviewResult, usage: FAKE_REVIEW_USAGE }; }

beforeAll(() => { _resetCache(); loadConfig(); });

beforeEach(() => {
  vi.mocked(generate).mockResolvedValue(genResult());
  vi.mocked(review).mockResolvedValue(revResult(PASS_RESULT));
  vi.mocked(readabilityGate).mockReturnValue({ grade: 6.0, pass: true });
});
afterEach(() => vi.resetAllMocks());

// ── happy path ─────────────────────────────────────────────────────────────────

describe('generateLesson — happy path (pass verdict)', () => {
  it('returns an object with html and usage', async () => {
    const result = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(typeof result.html).toBe('string');
    expect(result.usage).toBeDefined();
  });

  it('calls generate exactly once on pass', async () => {
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('calls review exactly once', async () => {
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('html contains the draft content', async () => {
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(html).toContain('Test lesson content');
  });

  it('html has no ===IMAGES=== trailer', async () => {
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(html).not.toContain('===IMAGES===');
  });

  it('html has no [[IMAGE_*]] markers', async () => {
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(html).not.toContain('[[IMAGE_');
  });

  it('usage aggregates generate and review token counts', async () => {
    const { usage } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(usage.inputTokens).toBe(FAKE_GEN_USAGE.inputTokens + FAKE_REVIEW_USAGE.inputTokens);
    expect(usage.outputTokens).toBe(FAKE_GEN_USAGE.outputTokens + FAKE_REVIEW_USAGE.outputTokens);
  });
});

// ── verdict: revise ────────────────────────────────────────────────────────────

describe('generateLesson — verdict: revise', () => {
  it('uses revised_essay when verdict is revise', async () => {
    vi.mocked(review).mockResolvedValueOnce(revResult(REVISE_RESULT));
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(html).toContain('Revised lesson');
  });

  it('calls generate only once on revise (no extra LLM call)', async () => {
    vi.mocked(review).mockResolvedValueOnce(revResult(REVISE_RESULT));
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('falls back to draft when revised_essay is absent', async () => {
    vi.mocked(review).mockResolvedValueOnce(revResult({ ...REVISE_RESULT, revised_essay: undefined }));
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(html).toContain('Test lesson content');
  });
});

// ── verdict: regenerate ────────────────────────────────────────────────────────

describe('generateLesson — verdict: regenerate', () => {
  it('calls generate twice on regenerate verdict', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(REGEN_RESULT));
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('passes priority_fixes in the regenerate extra note', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(REGEN_RESULT));
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    const [, extra] = vi.mocked(generate).mock.calls[1];
    expect(extra).toContain('Reduce concepts to ≤6');
    expect(extra).toContain('Expand to ≥300 words');
  });

  it('html uses the regenerated draft content', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(REGEN_RESULT));
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(html).toContain('Regenerated lesson');
  });

  it('usage includes tokens from both generate calls', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(REGEN_RESULT));
    const { usage } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(usage.inputTokens).toBe(
      FAKE_GEN_USAGE.inputTokens * 2 + FAKE_REVIEW_USAGE.inputTokens,
    );
  });
});

// ── readability gate ───────────────────────────────────────────────────────────

describe('generateLesson — readability gate', () => {
  it('calls readabilityGate for middle_schooler (fk_max = 7 ≤ 12)', async () => {
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(readabilityGate).toHaveBeenCalled();
  });

  it('does not call readabilityGate for adult_advanced (fk_max = 18 > 12)', async () => {
    await generateLesson('Photosynthesis', 'adult_advanced', 'balanced');
    expect(readabilityGate).not.toHaveBeenCalled();
  });

  it('calls generate once when gate passes immediately', async () => {
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('calls generate twice when gate fails once then passes', async () => {
    vi.mocked(readabilityGate)
      .mockReturnValueOnce({ grade: 15.0, pass: false })
      .mockReturnValueOnce({ grade: 6.0, pass: true });
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('downshift note includes the failing grade', async () => {
    vi.mocked(readabilityGate)
      .mockReturnValueOnce({ grade: 14.3, pass: false })
      .mockReturnValueOnce({ grade: 6.0, pass: true });
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    const [, extra] = vi.mocked(generate).mock.calls[1];
    expect(extra).toContain('14.3');
  });

  it('downshift note includes the tier fk_max', async () => {
    vi.mocked(readabilityGate)
      .mockReturnValueOnce({ grade: 14.3, pass: false })
      .mockReturnValueOnce({ grade: 6.0, pass: true });
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    const [, extra] = vi.mocked(generate).mock.calls[1];
    expect(extra).toContain('7'); // middle_schooler fk_max = 7
  });

  it('caps readability retries at 2 extra generates (3 total)', async () => {
    vi.mocked(readabilityGate).mockReturnValue({ grade: 15.0, pass: false });
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('proceeds to review even when gate keeps failing', async () => {
    vi.mocked(readabilityGate).mockReturnValue({ grade: 15.0, pass: false });
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(review).toHaveBeenCalledTimes(1);
  });
});

// ── markers_preserved override ─────────────────────────────────────────────────

describe('generateLesson — markers_preserved override', () => {
  it('treats pass verdict as regenerate when markers_preserved.pass is false', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(MARKERS_BAD_PASS));
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(2);
    expect(html).toContain('Regenerated lesson');
  });

  it('treats revise verdict as regenerate when markers_preserved.pass is false', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(MARKERS_BAD_REVISE));
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(2);
    expect(html).toContain('Regenerated lesson');
  });

  it('markers override extra note includes instruction to preserve markers', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce(genResult(DRAFT))
      .mockResolvedValueOnce(genResult(REGEN));
    vi.mocked(review).mockResolvedValueOnce(revResult(MARKERS_BAD_PASS));
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    const [, extra] = vi.mocked(generate).mock.calls[1];
    expect(extra).toContain('Preserve all [[IMAGE_id]] markers');
  });

  it('does not trigger extra generate when markers_preserved.pass is true', async () => {
    await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

// ── generation cap ─────────────────────────────────────────────────────────────

describe('generateLesson — generation cap', () => {
  it('uses best draft when cap is reached before review-regenerate', async () => {
    vi.mocked(readabilityGate).mockReturnValue({ grade: 15.0, pass: false });
    vi.mocked(review).mockResolvedValueOnce(revResult(REGEN_RESULT));
    const { html } = await generateLesson('Photosynthesis', 'middle_schooler', 'balanced');
    expect(generate).toHaveBeenCalledTimes(3); // 1 + 2 retries = cap
    expect(html).toContain('Test lesson content');
  });
});
