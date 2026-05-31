# Illustration Placement Spec

Places pre-generated images (max 2 per topic) into the essay. **Placement is folded into the generator** (option 1): because the position of an image only becomes knowable once the prose exists, the essay generator is the component that decides it — it drops `[[IMAGE_<id>]]` markers as it writes, and a deterministic step swaps them for a `<figure>`. The generator outputs HTML, so inserted images are HTML too. The full marker mechanics live in `generation-review-prompts.md`.

This file is the **policy source** that generation consumes — the per-tier posture, caption guidance, and ceilings below are injected into the generator — plus a **decoupled fallback** (a standalone matching pass) for teams who'd rather keep placement separate from generation for isolated testing.

The defining design point either way: **image posture changes by learner tier** — younger tiers lead with images, adult tiers use them only when they earn their place.

---

## Per-tier image policy

Add to config. `max_images` is your hard ceiling of 2 everywhere; `posture` + threshold decide how many actually get placed, which naturally thins usage toward the expert end.

**Which fields go where:** the generator (option 1) consumes `posture` and `max_images`, and uses `position` for the `leading` case (marker before its line). `min_relevance` is a numeric threshold used only by the decoupled fallback pass — the generator applies posture qualitatively instead of scoring.

```json
{
  "image_policy": {
    "early_learner":      { "posture": "leading",      "min_relevance": 0.30, "position": "before", "max_images": 2 },
    "young_child":        { "posture": "integrated",   "min_relevance": 0.40, "position": "after",  "max_images": 2 },
    "middle_schooler":    { "posture": "supportive",   "min_relevance": 0.50, "position": "after",  "max_images": 2 },
    "high_schooler":      { "posture": "supportive",   "min_relevance": 0.60, "position": "after",  "max_images": 2 },
    "adult_beginner":     { "posture": "supportive",   "min_relevance": 0.60, "position": "after",  "max_images": 2 },
    "adult_intermediate": { "posture": "sparing",      "min_relevance": 0.70, "position": "after",  "max_images": 2 },
    "adult_advanced":     { "posture": "diagram_only", "min_relevance": 0.80, "position": "after",  "max_images": 2 }
  }
}
```

Posture meanings:

| Posture | Behaviour |
|---|---|
| `leading` | The image carries the content; text supports it. Image goes first, then the spoken line(s) about it. |
| `integrated` | Place close to the concept shown; generous use aids comprehension. |
| `supportive` | Use where an image clarifies a specific concept; skip purely decorative placement. |
| `sparing` | Only for ideas that genuinely benefit from a visual; prefer none over decorative. |
| `diagram_only` | Place only if the illustration is a real diagram/structure conveying what prose can't; otherwise omit. |

> **Upstream optimization:** the higher tiers will frequently *omit* images at these thresholds — which wastes the image generation the outline creator already paid for. Consider having the outline creator generate fewer (or zero) illustration prompts for `adult_intermediate`/`adult_advanced` topics, or only diagram-type prompts, rather than generating two and discarding them at placement.

---

## Why placement lives in the generator

An earlier draft of this spec proposed a tag-based deterministic path: have the outline creator tag each illustration prompt with a `target_concept`, then join on that. The problem is that the outline creator works only from the topic *description*, before any prose exists — it can label *which concept* an image depicts, but a concept label doesn't place anything until you also know which paragraph covers that concept, and that's only knowable once the essay is written. Closing the loop deterministically would require instrumenting *both* the outline creator (tag the prompt) *and* the generator (tag each section with the same concept vocabulary) and joining them — more plumbing than option 1, for no better result.

Since the generator is the only component that knows positions anyway, it places the markers directly. The marker prompt block, the `===IMAGES===` trailer, and the deterministic `insertImageMarkers()` swap are all defined in `generation-review-prompts.md`. The per-tier `posture` / `max_images` / `caption_guidance` it relies on are the maps in this file.

---

## Decoupled fallback — standalone placement pass

Use this only if you want placement separated from generation (e.g. to test placement in isolation, or to place images into essays that were written without marker awareness). It's a cheap (Haiku-class) call that matches each illustration to the best paragraph of a *finished* essay, with an omit option. The generator does NOT emit markers in this mode.

### System prompt

```
You decide where pre-generated illustrations belong in an educational piece for {{level_label}}, and you do NOT place an image where it doesn't genuinely fit. Omitting a weak image is correct, not a failure.

READER
{{audience_mindset}}

IMAGE POSTURE FOR THIS AUDIENCE
{{posture}} — {{posture_explanation}}
Only place an illustration if its best-match relevance is at least {{min_relevance}}.

INPUT
- The piece as numbered paragraphs.
- A list of illustration descriptions (the prompts used to generate them).

FOR EACH ILLUSTRATION
- Find the paragraph it most directly illustrates.
- If best relevance < {{min_relevance}}, omit it.
- Never assign two illustrations to the same anchor — spread them across the piece.
- Write a caption / alt text calibrated to the reader: {{caption_guidance}}.

Position each placed image {{position}} its anchor paragraph.
Return ONLY valid JSON matching the schema. No prose, no markdown fences.
```

`{{posture_explanation}}` and `{{caption_guidance}}` per tier:

```json
{
  "posture_explanation": {
    "leading":      "The image carries the meaning; the words support it. Favour placing both images.",
    "integrated":   "Place each image right next to the concept it shows; generous use helps.",
    "supportive":   "Place an image where it clarifies a specific concept; do not place it just because one exists.",
    "sparing":      "Only place an image for an idea that genuinely benefits from a visual; prefer fewer.",
    "diagram_only": "Place only if the illustration is a true diagram or structure that conveys something prose can't. Otherwise omit."
  },
  "caption_guidance": {
    "early_learner":      "one short, concrete spoken line a caregiver can read aloud",
    "young_child":        "one simple sentence naming what's shown",
    "middle_schooler":    "a short caption linking the image to the concept",
    "high_schooler":      "a precise caption stating what the image conveys",
    "adult_beginner":     "a clear caption that orients a newcomer",
    "adult_intermediate": "a concise, informative caption",
    "adult_advanced":     "a precise technical label / figure caption"
  }
}
```

### Output schema

```json
{
  "placements": [
    {
      "image_id": "img_1",
      "anchor_paragraph": 3,
      "position": "after",
      "relevance": 0.0,
      "caption": "tier-appropriate caption / alt text",
      "reason": "one short line"
    }
  ],
  "omitted": [
    { "image_id": "img_2", "reason": "best relevance 0.4 < threshold 0.6" }
  ]
}
```

---

## Insertion for the fallback pass

The primary path (option 1) inserts via marker-swap — see `insertImageMarkers()` in `generation-review-prompts.md`. The fallback pass instead returns block indices, so it uses an index splice. Either way the splice is pure code, so the reviewed essay text is never altered — only image HTML is inserted. Here "blocks" are the top-level HTML block elements (the `<p>`, `<h2>`, `<ul>`… you numbered when feeding the pass), not markdown paragraphs.

```ts
function insertImages(blocks: string[], placements): string {
  // sort so later anchors are spliced first → indices stay valid
  const sorted = [...placements].sort((a, b) => b.anchor_paragraph - a.anchor_paragraph);
  const out = [...blocks];
  for (const p of sorted) {
    const fig = `<figure><img src="${escapeAttr(p.url)}" alt="${escapeAttr(p.caption)}">`
              + (p.caption ? `<figcaption>${escapeHtml(p.caption)}</figcaption>` : "")
              + `</figure>`;
    const i = p.anchor_paragraph;
    if (p.position === "before") out.splice(i, 0, fig);
    else out.splice(i + 1, 0, fig);
  }
  return out.join("\n");
}
```

Alt text comes straight from `caption` in both paths, so accessibility is handled in the same step — worth keeping for a learning product. Run the result through the same HTML sanitizer the primary path uses.

---

## Where it fits in the pipeline

**Primary (option 1):** placement happens inside GENERATE; insertion is the last step.

```
GENERATE (emits [[IMAGE_id]] markers + trailer) → FK GATE → REVIEW (markers preserved)
        → [verdict resolved] → insertImageMarkers() → final essay with images
```

**Decoupled fallback:** generator emits no markers; a separate pass places into the finished essay.

```
GENERATE → FK GATE → REVIEW → split into HTML blocks → placement pass (LLM call 3)
        → insertImages() → final essay with images
```

Either way, placement resolves **after** review — placing images into a draft that then gets revised or regenerated wastes the work and can leave images stranded next to deleted paragraphs. (In the primary path this is automatic: markers ride along through review and are only swapped at the very end.)

---

## Per-tier notes

- **Early Learner** — `leading` + `position: before`. Each image opens a mini-scene; the read-aloud line follows it. Both images almost always used. The image is the lesson.
- **Young Child** — `integrated`. Place beside the concept paragraph; low threshold so images appear often.
- **Middle / High Schooler** — `supportive`. Threshold rises; an image that doesn't clarify a specific concept gets omitted rather than dropped in decoratively.
- **Adult Beginner** — `supportive` but watch for filler: a generic decorative image next to adult prose reads as padding. The caption should orient, not just label.
- **Adult Intermediate** — `sparing`. Often lands on 0–1 images even though 2 were generated.
- **Adult Advanced** — `diagram_only`. Decorative illustration is unwelcome here; only a genuine diagram earns placement. This is the tier most likely to omit both — hence the upstream suggestion to not generate decorative prompts for it at all.
```