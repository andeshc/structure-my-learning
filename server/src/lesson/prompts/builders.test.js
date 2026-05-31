import { describe, it, expect, beforeAll } from 'vitest';
import { loadConfig, _resetCache } from '../config/load.js';
import { resolve } from './slots.js';
import {
  buildGeneratorSystem,
  buildGeneratorTask,
  buildReviewerSystem,
  buildReviewerTask,
} from './builders.js';

const TOPIC = 'Plate tectonics';
const IMGS = [
  { id: '1', prompt: 'A cross-section of tectonic plates colliding.', url: 'https://ex.com/1.png' },
  { id: '2', prompt: 'A world map showing plate boundaries.', url: 'https://ex.com/2.png' },
];

let cfg;
let sWithImgs;   // middle_schooler / balanced / 2 illustrations
let sNoImgs;     // middle_schooler / balanced / no illustrations
let sEarly;      // early_learner / balanced / 2 illustrations
let sAdvanced;   // adult_advanced / comprehensive / no illustrations

beforeAll(() => {
  _resetCache();
  cfg = loadConfig();
  sWithImgs = resolve(cfg, TOPIC, 'middle_schooler', 'balanced', IMGS);
  sNoImgs   = resolve(cfg, TOPIC, 'middle_schooler', 'balanced');
  sEarly    = resolve(cfg, TOPIC, 'early_learner',   'balanced', IMGS);
  sAdvanced = resolve(cfg, TOPIC, 'adult_advanced',  'comprehensive');
});

// ── buildGeneratorSystem ───────────────────────────────────────────────────────

describe('buildGeneratorSystem', () => {
  it('returns a string', () => {
    expect(typeof buildGeneratorSystem(sWithImgs)).toBe('string');
  });

  it('contains the level_label', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain(sWithImgs.level_label);
  });

  it('contains fk_min and fk_max', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain(`${sWithImgs.fk_min}–${sWithImgs.fk_max}`);
  });

  it('contains concept_budget (appears twice — ceiling rule)', () => {
    const out = buildGeneratorSystem(sWithImgs);
    const count = [...out.matchAll(new RegExp(`\\b${sWithImgs.concept_budget}\\b`, 'g'))].length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('contains audience_mindset', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain(sWithImgs.audience_mindset);
  });

  it('contains avoid_list', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain(sWithImgs.avoid_list);
  });

  it('contains vocabulary', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain(sWithImgs.vocabulary);
  });

  it('contains posture and posture_explanation when imgs present', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain(sWithImgs.posture);
    expect(out).toContain(sWithImgs.posture_explanation);
  });

  it('contains ILLUSTRATIONS section when imgs present', () => {
    const out = buildGeneratorSystem(sWithImgs);
    expect(out).toContain('ILLUSTRATIONS');
  });

  it('omits ILLUSTRATIONS section when no imgs', () => {
    const out = buildGeneratorSystem(sNoImgs);
    expect(out).not.toContain('ILLUSTRATIONS');
  });

  it('posture/posture_explanation absent when no imgs', () => {
    const out = buildGeneratorSystem(sNoImgs);
    expect(out).not.toContain('posture');
  });
});

// ── buildGeneratorTask ─────────────────────────────────────────────────────────

describe('buildGeneratorTask', () => {
  it('returns a string', () => {
    expect(typeof buildGeneratorTask(sWithImgs)).toBe('string');
  });

  it('contains the topic', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain(TOPIC);
  });

  it('contains coverage_mode', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain(sWithImgs.coverage_mode);
  });

  it('contains coverage_scope', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain(sWithImgs.coverage_scope);
  });

  it('contains word_min and word_max', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain(`${sWithImgs.word_min}–${sWithImgs.word_max}`);
  });

  it('contains concept_budget in TARGETS', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain(`at most ${sWithImgs.concept_budget}`);
  });

  it('tag list is derived from allowed_tags (not hardcoded)', () => {
    const out = buildGeneratorTask(sWithImgs);
    const expected = sWithImgs.allowed_tags.map((t) => `<${t}>`).join(' ');
    expect(out).toContain(expected);
  });

  it('contains ILLUSTRATIONS AVAILABLE section when imgs present', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain('ILLUSTRATIONS AVAILABLE');
    expect(out).toContain(sWithImgs.illustrations_block);
  });

  it('contains trailer instructions when imgs present', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain('===IMAGES===');
    expect(out).toContain(sWithImgs.caption_guidance);
  });

  it('omits ILLUSTRATIONS AVAILABLE section when no imgs', () => {
    const out = buildGeneratorTask(sNoImgs);
    expect(out).not.toContain('ILLUSTRATIONS AVAILABLE');
  });

  it('omits trailer instructions when no imgs', () => {
    const out = buildGeneratorTask(sNoImgs);
    expect(out).not.toContain('===IMAGES===');
  });

  it('standard tier: begins with "Write a {{coverage_mode}} explanatory piece on:"', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain(`Write a ${sWithImgs.coverage_mode} explanatory piece on:`);
  });

  it('standard tier: output format says "Begin with the title in an <h1>"', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain('Begin with the title in an <h1>');
  });

  it('standard tier: markers placed BETWEEN block elements', () => {
    const out = buildGeneratorTask(sWithImgs);
    expect(out).toContain('BETWEEN block elements');
  });

  it('early_learner: brief says "read-aloud script"', () => {
    const out = buildGeneratorTask(sEarly);
    expect(out).toContain('read-aloud script');
    expect(out).not.toContain('explanatory piece');
  });

  it('early_learner: output format says "Short spoken lines"', () => {
    const out = buildGeneratorTask(sEarly);
    expect(out).toContain('Short spoken lines');
  });

  it('early_learner: output format says no <h1> title', () => {
    const out = buildGeneratorTask(sEarly);
    expect(out).toContain('No <h1> title');
  });

  it('early_learner: markers placed BEFORE the <p>', () => {
    const out = buildGeneratorTask(sEarly);
    expect(out).toContain('BEFORE the <p>');
    expect(out).not.toContain('BETWEEN block elements');
  });

  it('appends extra when provided', () => {
    const note = 'The previous draft read at grade 8; rewrite at grade 4 or below.';
    const out = buildGeneratorTask(sWithImgs, note);
    expect(out).toContain(note);
  });

  it('does not add trailing whitespace from extra when extra is empty', () => {
    const out = buildGeneratorTask(sNoImgs);
    expect(out.endsWith('no notes, no explanation of your choices.')).toBe(true);
  });
});

// ── buildReviewerSystem ────────────────────────────────────────────────────────

describe('buildReviewerSystem', () => {
  it('returns a string', () => {
    expect(typeof buildReviewerSystem(sWithImgs)).toBe('string');
  });

  it('contains level_label', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(sWithImgs.level_label);
  });

  it('contains audience_mindset', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(sWithImgs.audience_mindset);
  });

  it('contains fk_min–fk_max in AUDIENCE SPECIFICATION', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(`FK grade ${sWithImgs.fk_min}–${sWithImgs.fk_max}`);
  });

  it('contains concept_budget', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(String(sWithImgs.concept_budget));
  });

  it('contains word_min–word_max', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(`${sWithImgs.word_min}–${sWithImgs.word_max} words`);
  });

  it('contains coverage_mode and coverage_scope', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(`${sWithImgs.coverage_mode} — ${sWithImgs.coverage_scope}`);
  });

  it('tag list in FORMAT section is derived from allowed_tags', () => {
    const out = buildReviewerSystem(sWithImgs);
    const expected = sWithImgs.allowed_tags.join(', ');
    expect(out).toContain(`allowed tags: ${expected}`);
  });

  it('contains all 7 check items', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain('concept_count');
    expect(out).toContain('vocabulary');
    expect(out).toContain('tone_register');
    expect(out).toContain('scaffolding');
    expect(out).toContain('coverage_fidelity');
    expect(out).toContain('length');
    expect(out).toContain('accuracy_flags');
  });

  it('contains VERDICT RULE with all three verdicts', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain('"regenerate"');
    expect(out).toContain('"revise"');
    expect(out).toContain('"pass"');
  });

  it('ends with the JSON output instruction', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain('Return ONLY valid JSON matching the schema. No prose, no markdown fences.');
  });

  it('avoid_list appears in AUDIENCE SPECIFICATION', () => {
    const out = buildReviewerSystem(sWithImgs);
    expect(out).toContain(sWithImgs.avoid_list);
  });

  it('adult_advanced slots fill correctly (concept_budget = 22)', () => {
    const out = buildReviewerSystem(sAdvanced);
    expect(out).toContain('22');
    expect(out).toContain(sAdvanced.level_label);
  });
});

// ── buildReviewerTask ──────────────────────────────────────────────────────────

describe('buildReviewerTask', () => {
  const DRAFT = '<h1>Plate Tectonics</h1>\n<p>The Earth moves.</p>\n[[IMAGE_1]]\n<p>More text.</p>\n===IMAGES===\nIMAGE_1 | placed | Colliding plates';

  it('returns a string', () => {
    expect(typeof buildReviewerTask(sWithImgs, DRAFT)).toBe('string');
  });

  it('contains the full draft verbatim', () => {
    const out = buildReviewerTask(sWithImgs, DRAFT);
    expect(out).toContain(DRAFT);
  });

  it('draft with markers and trailer passes through intact', () => {
    const out = buildReviewerTask(sWithImgs, DRAFT);
    expect(out).toContain('[[IMAGE_');
    expect(out).toContain('===IMAGES===');
  });
});
