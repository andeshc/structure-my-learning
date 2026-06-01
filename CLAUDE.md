
## Lesson generation pipeline

Tiered educational-content pipeline: given a topic, learner level, coverage depth, and up
to two pre-generated illustrations, produces a calibrated HTML lesson with images inline.
Two LLM calls (generate, review) plus deterministic steps (readability gate, image
insertion, HTML sanitization).

Docs (read in this order):
- `docs/ARCHITECTURE.md` — types, module contracts, data flow, testing
- `docs/CONFIG.md` — canonical config + resolve logic
- `docs/specs/` — exact prompt bodies and per-tier calibration rationale

`src/config/content-config.json` is the single source of truth for all calibration values.

### Conventions

1. **One source of truth for config.** All level/coverage/image/tag values come from
   `content-config.json`. Never hardcode them in prompt strings — derive prompt fragments
   from config. The HTML tag allow-list is read by the generator prompt, the reviewer
   prompt, AND the sanitizer.
2. **Deterministic steps stay deterministic.** Readability gate, marker insertion, and
   sanitization are pure code — no LLM calls.
3. **Output is HTML, never markdown.** Generator emits an HTML fragment restricted to the
   allow-list tags. `<figure>/<img>/<figcaption>` are added at insertion, so they must be
   on the sanitizer allow-list even though the generator never emits them.
4. **Placement is folded into generation (option 1).** No separate placement LLM call; the
   generator drops `[[IMAGE_<id>]]` markers and a deterministic step swaps them. The
   decoupled fallback pass in `docs/specs/image-placement.md` is not the default.
5. **Run placement/insertion AFTER review.** Markers ride through review untouched and are
   only swapped at the very end.
6. **Prompt text is canonical in the specs.** `docs/specs/generation-review-prompts.md`
   holds the exact generator/reviewer prompt bodies. Reproduce that text with slots filled
   — do not paraphrase.