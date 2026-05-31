/**
 * Slot resolution for the lesson generation pipeline.
 * Converts (cfg, topic, levelId, coverageId, imgs) into a fully populated Slots object
 * ready to be interpolated into generator and reviewer prompts.
 */

/**
 * @param {import('../types.js').LevelProfile} level
 * @param {import('../types.js').CoverageId} coverageId
 * @param {import('../types.js').ContentConfig} cfg
 * @returns {number}
 */
function conceptBudget(level, coverageId, cfg) {
  if (level.concept_cap == null) {
    return cfg.advanced_concept_demand[coverageId];
  }
  return Math.round(level.concept_cap * cfg.coverage[coverageId].concept_fraction);
}

/**
 * @param {import('../types.js').LevelProfile} level
 * @param {import('../types.js').CoverageId} coverageId
 * @param {import('../types.js').ContentConfig} cfg
 * @returns {[number, number]}
 */
function wordTarget(level, coverageId, cfg) {
  const m = cfg.coverage[coverageId].length_multiplier;
  const [lo, hi] = level.baseline_word_count;
  return [Math.round(lo * m), Math.round(hi * m)];
}

/**
 * @param {import('../types.js').Illustration[]} imgs
 * @param {number} maxImages
 * @returns {string}
 */
function illustrationsBlock(imgs, maxImages) {
  return imgs
    .slice(0, maxImages)
    .map(i => `IMAGE_${i.id}: ${i.prompt}`)
    .join('\n');
}

/**
 * Resolve runtime inputs into a fully populated Slots object.
 * Throws for unknown levelId or coverageId.
 *
 * @param {import('../types.js').ContentConfig} cfg
 * @param {string} topic
 * @param {import('../types.js').LevelId} levelId
 * @param {import('../types.js').CoverageId} coverageId
 * @param {import('../types.js').Illustration[]} [imgs]
 * @returns {import('../types.js').Slots}
 */
export function resolve(cfg, topic, levelId, coverageId, imgs = []) {
  const level = cfg.levels[levelId];
  if (!level) throw new Error(`Unknown levelId: ${levelId}`);

  const coverage = cfg.coverage[coverageId];
  if (!coverage) throw new Error(`Unknown coverageId: ${coverageId}`);

  const policy = cfg.image_policy[levelId];
  const [fk_min, fk_max] = level.readability_fk;
  const [sentence_min, sentence_max] = level.sentence_words;
  const [word_min, word_max] = wordTarget(level, coverageId, cfg);
  const limitedImgs = imgs.slice(0, policy.max_images);

  return {
    topic,
    level_label: level.label,
    audience_mindset: level.audience_mindset,
    fk_min,
    fk_max,
    vocabulary: level.vocabulary,
    sentence_min,
    sentence_max,
    concepts_per_section: level.concepts_per_section,
    abstraction: level.abstraction,
    analogy_density: level.analogy_density,
    assumed_knowledge: level.assumed_knowledge,
    tone: level.tone,
    avoid_list: level.avoid.join('; '),
    concept_budget: conceptBudget(level, coverageId, cfg),
    word_min,
    word_max,
    coverage_mode: coverageId,
    coverage_scope: coverage.scope,
    max_images: policy.max_images,
    posture: policy.posture,
    posture_explanation: cfg.posture_explanation[policy.posture],
    caption_guidance: cfg.caption_guidance[levelId],
    illustrations_block: illustrationsBlock(limitedImgs, policy.max_images),
    allowed_tags: cfg.html_allowed_tags,
    _levelId: levelId,
    _imgs: limitedImgs,
  };
}
