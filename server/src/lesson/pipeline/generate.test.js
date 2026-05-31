import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest';

vi.mock('../llm.js', () => ({
  llm:      vi.fn(),
  getModel: vi.fn((role) => `mock-${role}`),
}));

import { llm } from '../llm.js';
import { generate } from './generate.js';
import { loadConfig, _resetCache } from '../config/load.js';
import { resolve } from '../prompts/slots.js';

const FAKE_DRAFT =
  '<h1>Photosynthesis</h1>\n<p>Plants make food.</p>\n===IMAGES===\nIMAGE_1 | unused';

let slots;
beforeAll(() => {
  _resetCache();
  const cfg = loadConfig();
  slots = resolve(cfg, 'Photosynthesis', 'middle_schooler', 'balanced');
});

afterEach(() => vi.clearAllMocks());

describe('generate', () => {
  it('returns the raw string from llm', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    const result = await generate(slots);
    expect(result).toBe(FAKE_DRAFT);
  });

  it('calls llm exactly once', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    await generate(slots);
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it('passes a system prompt containing the level_label', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    await generate(slots);
    const [systemArg] = vi.mocked(llm).mock.calls[0];
    expect(systemArg).toContain(slots.level_label);
  });

  it('passes a task prompt containing the topic', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    await generate(slots);
    const [, taskArg] = vi.mocked(llm).mock.calls[0];
    expect(taskArg).toContain(slots.topic);
  });

  it('passes a task prompt containing the coverage_mode', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    await generate(slots);
    const [, taskArg] = vi.mocked(llm).mock.calls[0];
    expect(taskArg).toContain(slots.coverage_mode);
  });

  it('uses the generate model id', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    await generate(slots);
    const [, , optsArg] = vi.mocked(llm).mock.calls[0];
    expect(optsArg.model).toBe('mock-generate');
  });

  it('appends extra to the task prompt', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    const note = 'Previous draft was grade 8; rewrite at grade 4 or below.';
    await generate(slots, note);
    const [, taskArg] = vi.mocked(llm).mock.calls[0];
    expect(taskArg).toContain(note);
  });

  it('calls llm without extra appended when extra is empty string', async () => {
    vi.mocked(llm).mockResolvedValue(FAKE_DRAFT);
    await generate(slots, '');
    const [, taskArg] = vi.mocked(llm).mock.calls[0];
    expect(taskArg.endsWith('no notes, no explanation of your choices.')).toBe(true);
  });
});
