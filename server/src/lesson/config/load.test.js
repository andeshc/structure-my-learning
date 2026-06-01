import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, validateConfig, _resetCache } from './load.js';

// Deep-clone a config object so tests can mutate safely.
function clone(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

describe('loadConfig', () => {
  beforeEach(() => _resetCache());

  it('loads the real config without errors', () => {
    const cfg = loadConfig();
    expect(cfg).toBeTruthy();
  });

  it('returns an object with all 7 levels', () => {
    const cfg = loadConfig();
    const expected = [
      'early_learner', 'young_child', 'middle_schooler', 'high_schooler',
      'adult_beginner', 'adult_intermediate', 'adult_advanced',
    ];
    expect(Object.keys(cfg.levels)).toEqual(expect.arrayContaining(expected));
    expect(Object.keys(cfg.levels)).toHaveLength(7);
  });

  it('returns an object with all 3 coverage modes', () => {
    const cfg = loadConfig();
    expect(Object.keys(cfg.coverage)).toEqual(
      expect.arrayContaining(['overview', 'balanced', 'comprehensive'])
    );
  });

  it('has a non-empty html_allowed_tags list', () => {
    const cfg = loadConfig();
    expect(cfg.html_allowed_tags.length).toBeGreaterThan(0);
  });

  it('caches: second call returns the same object reference', () => {
    const a = loadConfig();
    const b = loadConfig();
    expect(a).toBe(b);
  });
});

describe('validateConfig — worked examples from CONFIG.md', () => {
  let base;
  beforeEach(() => {
    _resetCache();
    base = clone(loadConfig());
    _resetCache();
  });

  it('middle_schooler / overview → concept_budget = 4', () => {
    const cfg = base;
    const level = cfg.levels.middle_schooler;
    const cov = cfg.coverage.overview;
    const budget = Math.round(level.concept_cap * cov.concept_fraction);
    expect(budget).toBe(4);
  });

  it('middle_schooler / overview → word band [150, 300]', () => {
    const cfg = base;
    const [lo, hi] = cfg.levels.middle_schooler.baseline_word_count;
    const m = cfg.coverage.overview.length_multiplier;
    expect(Math.round(lo * m)).toBe(150);
    expect(Math.round(hi * m)).toBe(300);
  });

  it('adult_beginner / balanced → concept_budget = 8', () => {
    const cfg = base;
    const budget = Math.round(
      cfg.levels.adult_beginner.concept_cap * cfg.coverage.balanced.concept_fraction
    );
    expect(budget).toBe(8);
  });

  it('adult_advanced / comprehensive → uses advanced_concept_demand (concept_cap is null)', () => {
    const cfg = base;
    expect(cfg.levels.adult_advanced.concept_cap).toBeNull();
    expect(cfg.advanced_concept_demand.comprehensive).toBe(22);
  });

  it('early_learner / balanced → word band [50, 150]', () => {
    const cfg = base;
    const [lo, hi] = cfg.levels.early_learner.baseline_word_count;
    const m = cfg.coverage.balanced.length_multiplier;
    expect(Math.round(lo * m)).toBe(50);
    expect(Math.round(hi * m)).toBe(150);
  });
});

describe('validateConfig — error cases', () => {
  let base;
  beforeEach(() => {
    _resetCache();
    base = clone(loadConfig());
    _resetCache();
  });

  it('throws when a level is missing from levels', () => {
    const cfg = clone(base);
    delete cfg.levels.adult_advanced;
    expect(() => validateConfig(cfg)).toThrow('Missing level in levels: adult_advanced');
  });

  it('throws when a level is missing from image_policy', () => {
    const cfg = clone(base);
    delete cfg.image_policy.early_learner;
    expect(() => validateConfig(cfg)).toThrow('Missing level in image_policy: early_learner');
  });

  it('throws when a level is missing from caption_guidance', () => {
    const cfg = clone(base);
    delete cfg.caption_guidance.middle_schooler;
    expect(() => validateConfig(cfg)).toThrow('Missing level in caption_guidance: middle_schooler');
  });

  it('throws when html_allowed_tags is empty', () => {
    const cfg = clone(base);
    cfg.html_allowed_tags = [];
    expect(() => validateConfig(cfg)).toThrow('html_allowed_tags must not be empty');
  });

  it('throws when a length_multiplier is zero', () => {
    const cfg = clone(base);
    cfg.coverage.overview.length_multiplier = 0;
    expect(() => validateConfig(cfg)).toThrow('coverage.overview.length_multiplier must be > 0');
  });

  it('throws when a length_multiplier is negative', () => {
    const cfg = clone(base);
    cfg.coverage.balanced.length_multiplier = -1;
    expect(() => validateConfig(cfg)).toThrow('coverage.balanced.length_multiplier must be > 0');
  });

  it('throws when a concept_fraction is zero', () => {
    const cfg = clone(base);
    cfg.coverage.comprehensive.concept_fraction = 0;
    expect(() => validateConfig(cfg)).toThrow('coverage.comprehensive.concept_fraction must be > 0');
  });

  it('throws when a posture has no entry in posture_explanation', () => {
    const cfg = clone(base);
    cfg.image_policy.adult_advanced.posture = 'unknown_posture';
    expect(() => validateConfig(cfg)).toThrow(
      'posture "unknown_posture" (in image_policy.adult_advanced) has no entry in posture_explanation'
    );
  });
});
