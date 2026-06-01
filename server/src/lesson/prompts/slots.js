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
 * Replace {{code_language}} placeholders in a template string.
 * @param {string} s
 * @param {string | null | undefined} codeLanguage
 * @returns {string}
 */
function fillSlots(s, codeLanguage) {
  return s.replace(/\{\{code_language\}\}/g, codeLanguage ?? '');
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
 * @param {{ contentType?: string, codeLanguage?: string | null, overview?: string | null, details?: string[] | null }} [options]
 * @returns {import('../types.js').Slots}
 */
export function resolve(cfg, topic, levelId, coverageId, imgs = [], { contentType, codeLanguage, overview, details } = {}) {
  const level = cfg.levels[levelId];
  if (!level) throw new Error(`Unknown levelId: ${levelId}`);

  const coverage = cfg.coverage[coverageId];
  if (!coverage) throw new Error(`Unknown coverageId: ${coverageId}`);

  const policy = cfg.image_policy[levelId];
  const [fk_min, fk_max] = level.readability_fk;
  const [sentence_min, sentence_max] = level.sentence_words;
  const [word_min, word_max] = wordTarget(level, coverageId, cfg);
  const limitedImgs = imgs.slice(0, policy.max_images);

  const resolvedType = contentType ?? 'conceptual';
  const type = cfg.content_types?.[resolvedType] ?? cfg.content_types?.['conceptual'];
  const lang = codeLanguage ?? null;

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
    allowed_tags: [...cfg.html_allowed_tags, ...(type?.extra_tags ?? [])],
    content_type_label:  type?.label ?? resolvedType,
    building_blocks:     (type?.building_blocks ?? []).join('; '),
    content_directives:  fillSlots(type?.generator_directives ?? '', lang),
    type_review_checks:  (type?.review_checks ?? []).map(c => fillSlots(c, lang)).join('; '),
    code_language:       lang,
    code_class_pattern:  type?.code_class_pattern ?? null,
    subtopic_overview:   overview ?? '',
    subtopic_details:    details?.length ? details.map(d => `- ${d}`).join('\n') : '',
    _levelId: levelId,
    _imgs: limitedImgs,
  };
}
