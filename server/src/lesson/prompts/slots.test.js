import { describe, it, expect, beforeAll } from 'vitest';
import { loadConfig, _resetCache } from '../config/load.js';
import { resolve } from './slots.js';

let cfg;
beforeAll(() => {
  _resetCache();
  cfg = loadConfig();
});

// ── Worked examples from CONFIG.md ────────────────────────────────────────────

describe('resolve — concept_budget worked examples (CONFIG.md)', () => {
  it('middle_schooler / overview → 4', () => {
    const s = resolve(cfg, 'Photosynthesis', 'middle_schooler', 'overview');
    expect(s.concept_budget).toBe(4);
  });

  it('middle_schooler / comprehensive → 9', () => {
    const s = resolve(cfg, 'Photosynthesis', 'middle_schooler', 'comprehensive');
    expect(s.concept_budget).toBe(9);
  });

  it('adult_beginner / balanced → 8', () => {
    const s = resolve(cfg, 'Photosynthesis', 'adult_beginner', 'balanced');
    expect(s.concept_budget).toBe(8);
  });

  it('adult_advanced / comprehensive → 22 (demand table, concept_cap is null)', () => {
    const s = resolve(cfg, 'Photosynthesis', 'adult_advanced', 'comprehensive');
    expect(s.concept_budget).toBe(22);
  });

  it('early_learner / balanced → 3', () => {
    const s = resolve(cfg, 'Photosynthesis', 'early_learner', 'balanced');
    expect(s.concept_budget).toBe(3);
  });
});

describe('resolve — word band worked examples (CONFIG.md)', () => {
  it('middle_schooler / overview → [150, 300]', () => {
    const s = resolve(cfg, 'topic', 'middle_schooler', 'overview');
    expect(s.word_min).toBe(150);
    expect(s.word_max).toBe(300);
  });

  it('middle_schooler / comprehensive → [570, 1140]', () => {
    const s = resolve(cfg, 'topic', 'middle_schooler', 'comprehensive');
    expect(s.word_min).toBe(570);
    expect(s.word_max).toBe(1140);
  });

  it('adult_beginner / balanced → [500, 900]', () => {
    const s = resolve(cfg, 'topic', 'adult_beginner', 'balanced');
    expect(s.word_min).toBe(500);
    expect(s.word_max).toBe(900);
  });

  it('adult_advanced / comprehensive → [1710, 3800]', () => {
    const s = resolve(cfg, 'topic', 'adult_advanced', 'comprehensive');
    expect(s.word_min).toBe(1710);
    expect(s.word_max).toBe(3800);
  });

  it('early_learner / balanced → [50, 150]', () => {
    const s = resolve(cfg, 'topic', 'early_learner', 'balanced');
    expect(s.word_min).toBe(50);
    expect(s.word_max).toBe(150);
  });
});

// ── Coverage sweep ─────────────────────────────────────────────────────────────
// One tier × all three coverage modes: word count tracks the multiplier
// and concept_budget scales proportionally.

describe('resolve — coverage sweep (high_schooler)', () => {
  it('overview word_min < balanced word_min < comprehensive word_min', () => {
    const ov = resolve(cfg, 't', 'high_schooler', 'overview');
    const ba = resolve(cfg, 't', 'high_schooler', 'balanced');
    const co = resolve(cfg, 't', 'high_schooler', 'comprehensive');
    expect(ov.word_min).toBeLessThan(ba.word_min);
    expect(ba.word_min).toBeLessThan(co.word_min);
  });

  it('word bands match length_multiplier × baseline_word_count', () => {
    const [lo, hi] = cfg.levels.high_schooler.baseline_word_count;
    for (const coverageId of ['overview', 'balanced', 'comprehensive']) {
      const m = cfg.coverage[coverageId].length_multiplier;
      const s = resolve(cfg, 't', 'high_schooler', coverageId);
      expect(s.word_min).toBe(Math.round(lo * m));
      expect(s.word_max).toBe(Math.round(hi * m));
    }
  });

  it('concept_budget scales: overview < balanced < comprehensive', () => {
    const ov = resolve(cfg, 't', 'high_schooler', 'overview');
    const ba = resolve(cfg, 't', 'high_schooler', 'balanced');
    const co = resolve(cfg, 't', 'high_schooler', 'comprehensive');
    expect(ov.concept_budget).toBeLessThan(ba.concept_budget);
    expect(ba.concept_budget).toBeLessThan(co.concept_budget);
  });
});

// ── Direct slot copies ─────────────────────────────────────────────────────────

describe('resolve — direct slot copies', () => {
  it('copies readability_fk to fk_min / fk_max', () => {
    const s = resolve(cfg, 't', 'young_child', 'balanced');
    const [fk_min, fk_max] = cfg.levels.young_child.readability_fk;
    expect(s.fk_min).toBe(fk_min);
    expect(s.fk_max).toBe(fk_max);
  });

  it('copies sentence_words to sentence_min / sentence_max', () => {
    const s = resolve(cfg, 't', 'adult_intermediate', 'balanced');
    const [mn, mx] = cfg.levels.adult_intermediate.sentence_words;
    expect(s.sentence_min).toBe(mn);
    expect(s.sentence_max).toBe(mx);
  });

  it('copies level_label', () => {
    const s = resolve(cfg, 't', 'adult_advanced', 'overview');
    expect(s.level_label).toBe(cfg.levels.adult_advanced.label);
  });

  it('copies audience_mindset', () => {
    const s = resolve(cfg, 't', 'early_learner', 'balanced');
    expect(s.audience_mindset).toBe(cfg.levels.early_learner.audience_mindset);
  });

  it('copies coverage_scope from coverage.scope', () => {
    const s = resolve(cfg, 't', 'middle_schooler', 'comprehensive');
    expect(s.coverage_scope).toBe(cfg.coverage.comprehensive.scope);
  });

  it('sets coverage_mode to the coverageId key', () => {
    const s = resolve(cfg, 't', 'middle_schooler', 'comprehensive');
    expect(s.coverage_mode).toBe('comprehensive');
  });

  it('joins avoid array with "; "', () => {
    const s = resolve(cfg, 't', 'early_learner', 'balanced');
    expect(s.avoid_list).toBe(cfg.levels.early_learner.avoid.join('; '));
  });

  it('allowed_tags equals html_allowed_tags when content type has no extra_tags', () => {
    const s = resolve(cfg, 't', 'high_schooler', 'balanced');
    expect(s.allowed_tags).toEqual(cfg.html_allowed_tags);
  });
});

// ── Image policy slots ─────────────────────────────────────────────────────────

describe('resolve — image policy slots', () => {
  it('early_learner gets posture "leading"', () => {
    const s = resolve(cfg, 't', 'early_learner', 'balanced');
    expect(s.posture).toBe('leading');
  });

  it('adult_advanced gets posture "diagram_only"', () => {
    const s = resolve(cfg, 't', 'adult_advanced', 'balanced');
    expect(s.posture).toBe('diagram_only');
  });

  it('posture_explanation matches posture_explanation[posture]', () => {
    const s = resolve(cfg, 't', 'adult_intermediate', 'balanced');
    expect(s.posture_explanation).toBe(
      cfg.posture_explanation[cfg.image_policy.adult_intermediate.posture]
    );
  });

  it('caption_guidance matches caption_guidance[levelId]', () => {
    const s = resolve(cfg, 't', 'young_child', 'balanced');
    expect(s.caption_guidance).toBe(cfg.caption_guidance.young_child);
  });

  it('max_images comes from image_policy', () => {
    const s = resolve(cfg, 't', 'middle_schooler', 'balanced');
    expect(s.max_images).toBe(cfg.image_policy.middle_schooler.max_images);
  });
});

// ── Illustration handling ──────────────────────────────────────────────────────

describe('resolve — illustration handling', () => {
  const imgs = [
    { id: '1', prompt: 'A leaf cross-section.', url: 'https://example.com/1.png' },
    { id: '2', prompt: 'A flow diagram.', url: 'https://example.com/2.png' },
  ];

  it('builds illustrations_block as "IMAGE_<id>: <prompt>" lines', () => {
    const s = resolve(cfg, 't', 'young_child', 'balanced', imgs);
    expect(s.illustrations_block).toBe('IMAGE_1: A leaf cross-section.\nIMAGE_2: A flow diagram.');
  });

  it('limits _imgs to max_images', () => {
    const three = [
      ...imgs,
      { id: '3', prompt: 'Extra.', url: 'https://example.com/3.png' },
    ];
    const s = resolve(cfg, 't', 'young_child', 'balanced', three);
    expect(s._imgs).toHaveLength(2);
  });

  it('illustrations_block is empty string when no imgs passed', () => {
    const s = resolve(cfg, 't', 'middle_schooler', 'balanced');
    expect(s.illustrations_block).toBe('');
  });

  it('_imgs defaults to []', () => {
    const s = resolve(cfg, 't', 'middle_schooler', 'balanced');
    expect(s._imgs).toEqual([]);
  });

  it('_levelId carries the levelId through', () => {
    const s = resolve(cfg, 't', 'adult_intermediate', 'overview');
    expect(s._levelId).toBe('adult_intermediate');
  });

  it('topic carries the runtime topic through', () => {
    const s = resolve(cfg, 'Plate tectonics', 'middle_schooler', 'balanced');
    expect(s.topic).toBe('Plate tectonics');
  });
});

// ── Error cases ────────────────────────────────────────────────────────────────

describe('resolve — error cases', () => {
  it('throws for unknown levelId', () => {
    expect(() => resolve(cfg, 't', 'not_a_level', 'balanced')).toThrow('Unknown levelId: not_a_level');
  });

  it('throws for unknown coverageId', () => {
    expect(() => resolve(cfg, 't', 'adult_beginner', 'ultra')).toThrow('Unknown coverageId: ultra');
  });
});
