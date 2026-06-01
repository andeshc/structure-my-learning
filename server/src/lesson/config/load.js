import { readFileSync } from 'node:fs';

const CONFIG_URL = new URL('../../config/content-config.json', import.meta.url);

/** @type {string[]} */
const CONTENT_TYPE_IDS = ['conceptual', 'coding', 'mathematical', 'procedural'];

/** @type {string[]} */
const LEVEL_IDS = [
  'early_learner',
  'young_child',
  'middle_schooler',
  'high_schooler',
  'adult_beginner',
  'adult_intermediate',
  'adult_advanced',
];

/** @type {import('../types.js').ContentConfig | null} */
let cached = null;

/**
 * Validate a parsed ContentConfig object. Throws a descriptive Error on any violation.
 * Extracted so tests can exercise validation with synthetic configs.
 * @param {import('../types.js').ContentConfig} cfg
 * @returns {import('../types.js').ContentConfig} the same object, for chaining
 */
export function validateConfig(cfg) {
  for (const id of LEVEL_IDS) {
    if (!cfg.levels?.[id]) throw new Error(`Missing level in levels: ${id}`);
    if (!cfg.image_policy?.[id]) throw new Error(`Missing level in image_policy: ${id}`);
    if (!cfg.caption_guidance?.[id]) throw new Error(`Missing level in caption_guidance: ${id}`);
  }

  if (!cfg.html_allowed_tags || cfg.html_allowed_tags.length === 0) {
    throw new Error('html_allowed_tags must not be empty');
  }

  for (const [key, cov] of Object.entries(cfg.coverage ?? {})) {
    if (cov.length_multiplier <= 0) {
      throw new Error(`coverage.${key}.length_multiplier must be > 0`);
    }
    if (cov.concept_fraction <= 0) {
      throw new Error(`coverage.${key}.concept_fraction must be > 0`);
    }
  }

  for (const [id, policy] of Object.entries(cfg.image_policy ?? {})) {
    if (!cfg.posture_explanation?.[policy.posture]) {
      throw new Error(`posture "${policy.posture}" (in image_policy.${id}) has no entry in posture_explanation`);
    }
  }

  for (const id of CONTENT_TYPE_IDS) {
    if (!cfg.content_types?.[id]) throw new Error(`Missing content type in content_types: ${id}`);
  }

  return cfg;
}

/**
 * Load, validate, and cache content-config.json.
 * Throws if the file is missing or any validation rule is violated.
 * @returns {import('../types.js').ContentConfig}
 */
export function loadConfig() {
  if (cached) return cached;
  const raw = readFileSync(CONFIG_URL, 'utf8');
  cached = validateConfig(JSON.parse(raw));
  return cached;
}

/** Reset the in-memory cache. For use in tests only. */
export function _resetCache() {
  cached = null;
}
