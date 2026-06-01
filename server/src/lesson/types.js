/**
 * JSDoc typedefs for the lesson generation pipeline.
 * This file has no runtime exports — import it only for editor type hints via JSDoc.
 */

/** @typedef {'early_learner' | 'young_child' | 'middle_schooler' | 'high_schooler' | 'adult_beginner' | 'adult_intermediate' | 'adult_advanced'} LevelId */

/** @typedef {'overview' | 'balanced' | 'comprehensive'} CoverageId */

/** @typedef {'leading' | 'integrated' | 'supportive' | 'sparing' | 'diagram_only'} Posture */

/** @typedef {'conceptual' | 'coding' | 'mathematical' | 'procedural'} ContentTypeId */

/**
 * @typedef {Object} ContentTypeProfile
 * @property {string} label
 * @property {string[]} building_blocks
 * @property {string} generator_directives - may contain {{code_language}}; fill at resolve time
 * @property {string[]} extra_tags - additional HTML tags beyond html_allowed_tags
 * @property {Record<string, string[]>} extra_attrs - per-tag extra attributes (e.g. { code: ['class'] })
 * @property {string[]} review_checks - may contain {{code_language}}; fill at resolve time
 * @property {string[]} [requires] - runtime fields required at resolve (e.g. ['code_language'])
 * @property {string} [code_class_pattern] - regex pattern constraining code class values (coding only)
 * @property {string} [render] - client-side renderer hint e.g. 'katex' (mathematical only)
 */

/**
 * @typedef {Object} LevelProfile
 * @property {string} label
 * @property {[number, number] | null} age_range
 * @property {string} delivery
 * @property {[number, number]} readability_fk
 * @property {string} vocabulary
 * @property {[number, number]} sentence_words
 * @property {number} concepts_per_section
 * @property {string} analogy_density
 * @property {string} abstraction
 * @property {string} assumed_knowledge
 * @property {string} tone
 * @property {[number, number]} baseline_word_count
 * @property {number | null} concept_cap - null for adult_advanced (topic-driven)
 * @property {string[]} avoid
 * @property {string} audience_mindset
 */

/**
 * @typedef {Object} Coverage
 * @property {number} length_multiplier - multiplied by baseline_word_count
 * @property {number} concept_fraction - fraction of concept_cap to use
 * @property {string} scope
 */

/**
 * @typedef {Object} ImagePolicy
 * @property {Posture} posture
 * @property {number} min_relevance - used only by the decoupled fallback pass
 * @property {'before' | 'after'} position
 * @property {number} max_images
 */

/**
 * @typedef {Object} ContentConfig
 * @property {Record<LevelId, LevelProfile>} levels
 * @property {Record<CoverageId, Coverage>} coverage
 * @property {Record<LevelId, ImagePolicy>} image_policy
 * @property {Record<Posture, string>} posture_explanation
 * @property {Record<LevelId, string>} caption_guidance
 * @property {string[]} html_allowed_tags - generator output tags; figure/img/figcaption added at insertion
 * @property {Record<CoverageId, number>} advanced_concept_demand - used when concept_cap is null
 * @property {Record<ContentTypeId, ContentTypeProfile>} content_types
 */

/**
 * @typedef {Object} Illustration
 * @property {string} id
 * @property {string} prompt
 * @property {string} url
 */

/**
 * @typedef {Object} Slots
 * @property {string} topic - the runtime topic string, passed through for prompt interpolation
 * @property {string} level_label
 * @property {string} audience_mindset
 * @property {number} fk_min
 * @property {number} fk_max
 * @property {string} vocabulary
 * @property {number} sentence_min
 * @property {number} sentence_max
 * @property {number} concepts_per_section
 * @property {string} abstraction
 * @property {string} analogy_density
 * @property {string} assumed_knowledge
 * @property {string} tone
 * @property {string} avoid_list - level.avoid joined with "; "
 * @property {number} concept_budget
 * @property {number} word_min
 * @property {number} word_max
 * @property {CoverageId} coverage_mode
 * @property {string} coverage_scope
 * @property {number} max_images
 * @property {Posture} posture
 * @property {string} posture_explanation
 * @property {string} caption_guidance
 * @property {string} illustrations_block - "IMAGE_1: <prompt>\nIMAGE_2: <prompt>"
 * @property {string[]} allowed_tags - base tags + content-type extra_tags
 * @property {string} content_type_label
 * @property {string} building_blocks - type.building_blocks joined with '; '
 * @property {string} content_directives - generator_directives with {{code_language}} filled
 * @property {string} type_review_checks - review_checks joined with '; ', {{code_language}} filled; '' for conceptual
 * @property {string | null} code_language - null for non-coding types
 * @property {string | null} code_class_pattern - pattern for <code class="..."> validation; null for non-coding types
 * @property {string} subtopic_overview - item.overview from the guide outline, or ''
 * @property {string} subtopic_details - item.details as bullet lines, or ''
 * @property {LevelId} _levelId - carried for downstream, not a template slot
 * @property {Illustration[]} _imgs - carried for downstream, not a template slot
 */

/**
 * @typedef {Object} ReviewChecks
 * @property {{ found: number, ceiling: number, pass: boolean, note?: string }} concept_count
 * @property {{ pass: boolean, violations: string[] }} vocabulary
 * @property {{ pass: boolean, note?: string }} tone_register
 * @property {{ pass: boolean, note?: string }} scaffolding
 * @property {{ pass: boolean, note?: string }} coverage_fidelity
 * @property {{ found: number, target: [number, number], pass: boolean }} length
 * @property {{ pass: boolean, note?: string }} markers_preserved
 * @property {string[]} accuracy_flags
 */

/**
 * @typedef {Object} ReviewResult
 * @property {'pass' | 'revise' | 'regenerate'} verdict
 * @property {ReviewChecks} checks
 * @property {string[]} priority_fixes
 * @property {string} [revised_essay]
 */
