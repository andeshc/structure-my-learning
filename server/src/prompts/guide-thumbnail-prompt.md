# Guide Thumbnail Prompt

Canonical runtime template for guide-card cover art. Read at module load by
`ai.service.js` via `parsePromptSections`; the builder fills the `{{SLOTS}}` from the
derived thumbnail spec and `content-config.json`'s `guide_thumbnail` palette. This is a
**thumbnail**, not an illustration: a small, instantly recognizable scene, zero text.
The flat-vector / cream-paper style deliberately matches the app's in-lesson house
illustrations (thin slate outlines, soft pastel fills) so cards feel like one family.

## Prompt

Course thumbnail as a clean flat vector illustration.

Subject: {{METAPHOR}}.

Show it as a small, instantly recognizable scene of a few related objects that clearly depicts the topic — NOT an abstract symbol or a single clever glyph. A viewer should know what the course is about at a glance. Arrange at most {{MAX_ELEMENTS}} simple shapes in a balanced, uncluttered composition with comfortable margins.

Draw it in a flat vector style with thin dark slate outlines and soft pastel fills — friendly, modern, editorial, no gradients or 3D shading. Use a {{BACKGROUND}} background filling the whole frame; let each object take its natural colour, leaning toward {{ACCENT}} where it reads naturally.

Bold, calm, modern, instantly readable as a small thumbnail. Include ONLY objects essential to the topic — do not pad the scene with unrelated decorative extras (potted plants, suns, clouds, target-and-arrow, sparkles, stars) unless they are genuinely part of the subject.

Absolutely NO readable text, letters, numbers, labels, captions, titles, flowcharts, connector arrows, grids of small icons, or scattered decorative confetti. Do not crowd the frame.
