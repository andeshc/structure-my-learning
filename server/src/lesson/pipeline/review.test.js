import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest';

vi.mock('../llm.js', () => ({
  llm:      vi.fn(),
  getModel: vi.fn((role) => `mock-${role}`),
}));

import { llm } from '../llm.js';
import { review } from './review.js';
import { loadConfig, _resetCache } from '../config/load.js';
import { resolve } from '../prompts/slots.js';

const DRAFT = '<h1>Plate Tectonics</h1>\n<p>The Earth moves.</p>';

const FAKE_USAGE = { inputTokens: 50, outputTokens: 100 };

// Minimal valid ReviewResult shapes for each verdict
const PASS_RESULT = {
  verdict: 'pass',
  checks: {
    concept_count:     { found: 3, ceiling: 6, pass: true },
    vocabulary:        { pass: true, violations: [] },
    tone_register:     { pass: true },
    scaffolding:       { pass: true },
    coverage_fidelity: { pass: true },
    length:            { found: 420, target: [300, 600], pass: true },
    markers_preserved: { pass: true, note: 'no markers' },
    accuracy_flags:    [],
  },
  priority_fixes: [],
};

const REVISE_RESULT = {
  verdict: 'revise',
  checks: {
    concept_count:     { found: 3, ceiling: 6, pass: true },
    vocabulary:        { pass: false, violations: ['tectonics undefined'] },
    tone_register:     { pass: true },
    scaffolding:       { pass: true },
    coverage_fidelity: { pass: true },
    length:            { found: 420, target: [300, 600], pass: true },
    markers_preserved: { pass: true },
    accuracy_flags:    [],
  },
  priority_fixes: ['Define "tectonics" on first use'],
  revised_essay:  '<h1>Plate Tectonics</h1><p>Tectonics (the study of Earth\'s plates) explains earthquakes.</p>',
};

const REGEN_RESULT = {
  verdict: 'regenerate',
  checks: {
    concept_count:     { found: 20, ceiling: 6, pass: false, note: 'far too many concepts' },
    vocabulary:        { pass: true, violations: [] },
    tone_register:     { pass: true },
    scaffolding:       { pass: false },
    coverage_fidelity: { pass: false, note: 'comprehensive requested, overview delivered' },
    length:            { found: 80, target: [300, 600], pass: false },
    markers_preserved: { pass: true },
    accuracy_flags:    [],
  },
  priority_fixes: ['Reduce concepts to ≤6', 'Expand to ≥300 words'],
};

function jsonOf(obj) {
  return JSON.stringify(obj);
}

function llmOk(obj) {
  return { text: jsonOf(obj), usage: FAKE_USAGE };
}

let slots;
beforeAll(() => {
  _resetCache();
  const cfg = loadConfig();
  slots = resolve(cfg, 'Plate Tectonics', 'middle_schooler', 'balanced');
});

afterEach(() => vi.clearAllMocks());

// ── happy paths ────────────────────────────────────────────────────────────────

describe('review — happy paths', () => {
  it('returns a pass ReviewResult', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('pass');
    expect(result.checks).toBeDefined();
    expect(Array.isArray(result.priority_fixes)).toBe(true);
  });

  it('returns a revise ReviewResult with revised_essay', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(REVISE_RESULT));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('revise');
    expect(result.revised_essay).toBeTruthy();
  });

  it('returns a regenerate ReviewResult', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(REGEN_RESULT));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('regenerate');
    expect(result.priority_fixes.length).toBeGreaterThan(0);
  });

  it('calls llm exactly once on first-attempt success', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    await review(slots, DRAFT);
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it('passes the review model id', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    await review(slots, DRAFT);
    const [, , opts] = vi.mocked(llm).mock.calls[0];
    expect(opts.model).toBe('mock-review');
  });

  it('passes json: true so the model prefills JSON', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    await review(slots, DRAFT);
    const [, , opts] = vi.mocked(llm).mock.calls[0];
    expect(opts.json).toBe(true);
  });

  it('system prompt contains level_label', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    await review(slots, DRAFT);
    const [systemArg] = vi.mocked(llm).mock.calls[0];
    expect(systemArg).toContain(slots.level_label);
  });

  it('task prompt contains the draft', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    await review(slots, DRAFT);
    const [, taskArg] = vi.mocked(llm).mock.calls[0];
    expect(taskArg).toContain(DRAFT);
  });

  it('returns usage from the llm call', async () => {
    vi.mocked(llm).mockResolvedValue(llmOk(PASS_RESULT));
    const { usage } = await review(slots, DRAFT);
    expect(usage.inputTokens).toBe(FAKE_USAGE.inputTokens);
    expect(usage.outputTokens).toBe(FAKE_USAGE.outputTokens);
  });
});

// ── code fence stripping ───────────────────────────────────────────────────────

describe('review — code fence stripping', () => {
  it('parses JSON wrapped in ```json fences', async () => {
    vi.mocked(llm).mockResolvedValue({ text: '```json\n' + jsonOf(PASS_RESULT) + '\n```', usage: FAKE_USAGE });
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('pass');
  });

  it('parses JSON wrapped in plain ``` fences', async () => {
    vi.mocked(llm).mockResolvedValue({ text: '```\n' + jsonOf(PASS_RESULT) + '\n```', usage: FAKE_USAGE });
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('pass');
  });
});

// ── retry on parse failure ─────────────────────────────────────────────────────

describe('review — retry on parse failure', () => {
  it('retries once when first response is invalid JSON', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({ text: 'not valid json at all', usage: FAKE_USAGE })
      .mockResolvedValueOnce(llmOk(PASS_RESULT));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('pass');
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('retry task prompt appends the JSON reminder', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({ text: 'broken', usage: FAKE_USAGE })
      .mockResolvedValueOnce(llmOk(PASS_RESULT));
    await review(slots, DRAFT);
    const [, retryTask] = vi.mocked(llm).mock.calls[1];
    expect(retryTask).toContain('Return ONLY valid JSON matching the schema');
  });

  it('returns synthetic regenerate when both attempts return invalid JSON', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({ text: 'bad json', usage: FAKE_USAGE })
      .mockResolvedValueOnce({ text: 'also bad json', usage: FAKE_USAGE });
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('regenerate');
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it('synthetic regenerate has a non-empty priority_fixes', async () => {
    vi.mocked(llm).mockResolvedValue({ text: '{}', usage: FAKE_USAGE });
    const { result } = await review(slots, DRAFT);
    expect(result.priority_fixes.length).toBeGreaterThan(0);
  });

  it('aggregates usage across both attempts on retry', async () => {
    vi.mocked(llm)
      .mockResolvedValueOnce({ text: 'bad json', usage: { inputTokens: 10, outputTokens: 20 } })
      .mockResolvedValueOnce(llmOk(PASS_RESULT));
    const { usage } = await review(slots, DRAFT);
    expect(usage.inputTokens).toBe(10 + FAKE_USAGE.inputTokens);
    expect(usage.outputTokens).toBe(20 + FAKE_USAGE.outputTokens);
  });
});

// ── schema validation ──────────────────────────────────────────────────────────

describe('review — schema validation', () => {
  it('rejects an unknown verdict and returns synthetic regenerate', async () => {
    const bad = { ...PASS_RESULT, verdict: 'unknown_verdict' };
    vi.mocked(llm)
      .mockResolvedValueOnce(llmOk(bad))
      .mockResolvedValueOnce(llmOk(bad));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('regenerate');
  });

  it('rejects a missing checks field and returns synthetic regenerate', async () => {
    const bad = { verdict: 'pass', priority_fixes: [] };
    vi.mocked(llm)
      .mockResolvedValueOnce(llmOk(bad))
      .mockResolvedValueOnce(llmOk(bad));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('regenerate');
  });

  it('rejects a non-array priority_fixes and returns synthetic regenerate', async () => {
    const bad = { verdict: 'pass', checks: {}, priority_fixes: 'not an array' };
    vi.mocked(llm)
      .mockResolvedValueOnce(llmOk(bad))
      .mockResolvedValueOnce(llmOk(bad));
    const { result } = await review(slots, DRAFT);
    expect(result.verdict).toBe('regenerate');
  });

  it('accepts all three valid verdict strings', async () => {
    for (const verdict of ['pass', 'revise', 'regenerate']) {
      vi.clearAllMocks();
      const payload = { verdict, checks: {}, priority_fixes: [] };
      vi.mocked(llm).mockResolvedValue(llmOk(payload));
      const { result } = await review(slots, DRAFT);
      expect(result.verdict).toBe(verdict);
    }
  });
});
