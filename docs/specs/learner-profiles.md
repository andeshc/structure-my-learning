# Learner Profiles & Topic Coverage Spec

A two-axis model for educational content generation.

- **Axis 1 — Learner Level** (7 profiles): controls *how* you communicate — vocabulary, sentence/paragraph length, cognitive load, scaffolding, assumed knowledge, tone.
- **Axis 2 — Topic Coverage** (3 modes): controls *how much* — breadth and depth of the topic.

The axes are composable: pick one level + one coverage mode. Coverage is a **modifier applied on top of a level**, bounded by that level's `concept_cap` (the max distinct new ideas the audience can absorb in one piece, regardless of how comprehensive you go).

Readability targets use Flesch–Kincaid (FK) grade as a cheap deterministic gate. Note FK saturates at the top end — for the three adult tiers the real lever is *assumed knowledge and idea density*, not reading grade.

---

## Axis 1 — Learner Levels

### 1. Early Learner (Ages 3–5)
Pre-readers. **An "essay" doesn't apply here** — content is a short read-aloud micro-explainer delivered by a caregiver, leaning heavily on imagery. Treat text as a script to be spoken, not read.

- **Delivery:** read aloud by an adult; pair with illustration
- **Readability:** pre-reading / emergent (FK K–1 if shown)
- **Vocabulary:** ~500–1,000 most-common words; concrete nouns and simple verbs only
- **Sentences:** 3–6 words, simple declaratives, lots of repetition
- **Cognitive load:** 1 idea total, restated several ways
- **Analogy/example:** no abstract analogies (mapping isn't developed yet) — use direct, touchable examples
- **Abstraction:** none; everything tied to things they can see, hear, or hold
- **Assumed knowledge:** everyday objects, family, animals, basic colours/counting
- **Tone:** warm, playful, lots of direct questions ("Can you see the…?")
- **Baseline length:** 50–150 words
- **Avoid:** abstraction, multi-step logic, time spans beyond "now/soon," any jargon

### 2. Young Child (Ages 6–10)
Transitioning from learning-to-read to reading-to-learn. Wide internal range.

- **Delivery:** independent reading or shared reading
- **Readability:** FK grade 1–4
- **Vocabulary:** common words; define each new word inline with a concrete example
- **Sentences:** 8–12 words; simple and compound
- **Cognitive load:** 1 new concept per paragraph
- **Analogy/example:** high density — toys, food, pets, playground, family
- **Abstraction:** concrete with very mild abstraction, always anchored
- **Assumed knowledge:** basic counting/arithmetic, everyday phenomena
- **Tone:** curious, encouraging, second person, occasional questions
- **Baseline length:** 150–400 words
- **Avoid:** undefined jargon, nested clauses, abstract-only explanation

### 3. Middle Schooler (Ages 11–13)
Capable of real abstraction but acutely sensitive to being talked down to.

- **Delivery:** independent reading
- **Readability:** FK grade 5–7
- **Vocabulary:** domain terms okay if defined on first use
- **Sentences:** medium; some complex structure
- **Cognitive load:** 1–2 new concepts per paragraph
- **Analogy/example:** moderate; abstraction acceptable when anchored to the concrete
- **Abstraction:** comfortable, with a concrete touchstone per new idea
- **Assumed knowledge:** basic math, intro science, some critical thinking
- **Tone:** respectful, genuinely engaging, never condescending
- **Baseline length:** 300–600 words
- **Avoid:** childish framing, oversimplification that feels patronizing

### 4. High Schooler (Ages 14–18)
Near-adult cognition; can handle nuance, tension, and competing views.

- **Delivery:** independent reading
- **Readability:** FK grade 8–11
- **Vocabulary:** domain terminology fine, defined on first use
- **Sentences:** varied; complex sentences welcome
- **Cognitive load:** 2–3 new concepts per paragraph
- **Analogy/example:** lower density; direct abstraction acceptable
- **Abstraction:** full; analogies reserved for genuinely hard ideas
- **Assumed knowledge:** algebra, foundational sciences, structured reasoning
- **Tone:** intellectually engaging, near-peer; can introduce debate and nuance
- **Baseline length:** 500–900 words
- **Avoid:** over-explaining basics, flattening real complexity

### 5. Adult Beginner
**Key distinction from children:** full abstract reasoning and a lifetime of experience to anchor to, but *zero* knowledge of this topic. Never patronize; the gap is domain knowledge, not intelligence.

- **Delivery:** independent reading
- **Readability:** FK grade 8–10 (accessible prose; topic vocabulary assumed at zero)
- **Vocabulary:** define all domain jargon; everyday adult language otherwise
- **Sentences:** normal adult prose
- **Cognitive load:** moderate; pace new ideas carefully
- **Analogy/example:** moderate; draw from common adult experience (work, money, driving, cooking) — not childish analogies
- **Abstraction:** full, but introduce one layer at a time
- **Assumed knowledge:** general adult life experience; nothing field-specific
- **Tone:** a knowledgeable peer who happens to know this area; respectful, never "explaining down"
- **Baseline length:** 500–900 words
- **Avoid:** unexplained jargon, assuming any prior exposure, condescension

### 6. Adult Intermediate
Has working knowledge; wants to deepen and connect.

- **Delivery:** independent reading
- **Readability:** FK grade 10–12
- **Vocabulary:** field terminology used freely; define only genuinely novel terms
- **Sentences:** full range
- **Cognitive load:** 3+ concepts per section
- **Analogy/example:** sparse; only for genuinely new or counterintuitive ideas
- **Abstraction:** high; assumes fundamentals are in place
- **Assumed knowledge:** fundamentals of the field
- **Tone:** peer-to-peer, practical; includes caveats, trade-offs, comparisons
- **Baseline length:** 700–1,200 words
- **Avoid:** re-teaching fundamentals, padding with basic analogies

### 7. Adult Advanced
Expert or near-expert. Over-explanation is insulting; precision and density are the value.

- **Delivery:** independent reading
- **Readability:** FK grade 13+ (treat as a weak signal; density and rigor matter more)
- **Vocabulary:** full terminology, no definitions of standard terms
- **Sentences:** unconstrained
- **Cognitive load:** high; driven by the topic, not a capacity ceiling
- **Analogy/example:** rare; reserved for frontier or cross-domain bridges
- **Abstraction:** maximal; assumes deep field knowledge
- **Assumed knowledge:** field internals, current standard practice
- **Tone:** precise, rigorous, peer; engages controversy, edge cases, open problems
- **Baseline length:** 900–2,000+ words
- **Avoid:** explaining known basics, hedging that wastes an expert's time

---

## Axis 2 — Topic Coverage

Applied on top of any level. Length multiplier is relative to that level's baseline word count.

| Mode | Scope | Length ×baseline | What's included |
|---|---|---|---|
| **Overview** | The gist | ~0.5× | The 1–2 core ideas + why it matters. No edge cases, no mechanism detail. "What is this and why care." |
| **Balanced** | Solid understanding | 1× | Core concepts + key supporting detail + 1–2 examples/applications. Minimal edge cases. The sensible default. |
| **Comprehensive** | Thorough | ~1.8–2× | Core + nuance + edge cases + exceptions + connections to related topics + deeper mechanism — **up to the level's `concept_cap`.** |

### The per-level concept cap
"Comprehensive" means different things at different levels. The cap is the max distinct *new* ideas to introduce, even at full coverage:

| Level | concept_cap (Comprehensive) |
|---|---|
| Early Learner | 3–4 simple ideas |
| Young Child | 5–6 |
| Middle Schooler | 7–9 |
| High Schooler | 10–14 |
| Adult Beginner | 8–12 (adult cognition, but topic-naive → pace it) |
| Adult Intermediate | 15–20 |
| Adult Advanced | unbounded (topic-driven) |

So Comprehensive for an Early Learner is still only ~4 simple ideas covered thoroughly and concretely — not a dense treatise. Coverage scales *breadth and depth within the level's limits*, it never overrides the level.

---

## Machine-readable config

```json
{
  "levels": {
    "early_learner": {
      "label": "Early Learner (Ages 3-5)",
      "age_range": [3, 5],
      "delivery": "read_aloud_by_caregiver",
      "readability_fk": [0, 1],
      "vocabulary": "500-1000 most common words; concrete nouns and simple verbs",
      "sentence_words": [3, 6],
      "concepts_per_section": 1,
      "analogy_density": "none_use_direct_concrete_examples",
      "abstraction": "none",
      "assumed_knowledge": "everyday objects, family, animals, basic colours/counting",
      "tone": "warm, playful, repetitive, question-driven",
      "baseline_word_count": [50, 150],
      "concept_cap": 4,
      "avoid": ["abstraction", "multi-step logic", "jargon", "long time spans"]
    },
    "young_child": {
      "label": "Young Child (Ages 6-10)",
      "age_range": [6, 10],
      "delivery": "independent_or_shared_reading",
      "readability_fk": [1, 4],
      "vocabulary": "common words; define new words inline with concrete examples",
      "sentence_words": [8, 12],
      "concepts_per_section": 1,
      "analogy_density": "high_everyday",
      "abstraction": "concrete_with_mild_anchored_abstraction",
      "assumed_knowledge": "basic arithmetic, everyday phenomena",
      "tone": "curious, encouraging, second person",
      "baseline_word_count": [150, 400],
      "concept_cap": 6,
      "avoid": ["undefined jargon", "nested clauses", "abstract-only explanation"]
    },
    "middle_schooler": {
      "label": "Middle Schooler (Ages 11-13)",
      "age_range": [11, 13],
      "delivery": "independent_reading",
      "readability_fk": [5, 7],
      "vocabulary": "domain terms okay if defined on first use",
      "sentence_words": [12, 18],
      "concepts_per_section": 2,
      "analogy_density": "moderate",
      "abstraction": "comfortable_with_concrete_touchstone",
      "assumed_knowledge": "basic math, intro science, some critical thinking",
      "tone": "respectful, engaging, never condescending",
      "baseline_word_count": [300, 600],
      "concept_cap": 9,
      "avoid": ["childish framing", "patronizing oversimplification"]
    },
    "high_schooler": {
      "label": "High Schooler (Ages 14-18)",
      "age_range": [14, 18],
      "delivery": "independent_reading",
      "readability_fk": [8, 11],
      "vocabulary": "domain terminology, defined on first use",
      "sentence_words": [15, 25],
      "concepts_per_section": 3,
      "analogy_density": "low",
      "abstraction": "full_analogies_for_hard_ideas_only",
      "assumed_knowledge": "algebra, foundational sciences, structured reasoning",
      "tone": "intellectually engaging, near-peer, nuance welcome",
      "baseline_word_count": [500, 900],
      "concept_cap": 14,
      "avoid": ["over-explaining basics", "flattening real complexity"]
    },
    "adult_beginner": {
      "label": "Adult Beginner",
      "age_range": null,
      "delivery": "independent_reading",
      "readability_fk": [8, 10],
      "vocabulary": "define all domain jargon; everyday adult language otherwise",
      "sentence_words": [12, 22],
      "concepts_per_section": 2,
      "analogy_density": "moderate_adult_experience_based",
      "abstraction": "full_one_layer_at_a_time",
      "assumed_knowledge": "general adult life experience only; nothing field-specific",
      "tone": "knowledgeable peer, respectful, never patronizing",
      "baseline_word_count": [500, 900],
      "concept_cap": 12,
      "avoid": ["unexplained jargon", "assuming prior exposure", "condescension"]
    },
    "adult_intermediate": {
      "label": "Adult Intermediate",
      "age_range": null,
      "delivery": "independent_reading",
      "readability_fk": [10, 12],
      "vocabulary": "field terminology free; define only genuinely novel terms",
      "sentence_words": [15, 30],
      "concepts_per_section": 4,
      "analogy_density": "sparse_novel_ideas_only",
      "abstraction": "high_assumes_fundamentals",
      "assumed_knowledge": "fundamentals of the field",
      "tone": "peer-to-peer, practical, includes trade-offs and comparisons",
      "baseline_word_count": [700, 1200],
      "concept_cap": 20,
      "avoid": ["re-teaching fundamentals", "basic analogies"]
    },
    "adult_advanced": {
      "label": "Adult Advanced",
      "age_range": null,
      "delivery": "independent_reading",
      "readability_fk": [13, 18],
      "vocabulary": "full terminology, no definitions of standard terms",
      "sentence_words": [15, 40],
      "concepts_per_section": 5,
      "analogy_density": "rare_frontier_or_cross_domain_only",
      "abstraction": "maximal_assumes_deep_field_knowledge",
      "assumed_knowledge": "field internals, current standard practice",
      "tone": "precise, rigorous, peer; engages controversy and open problems",
      "baseline_word_count": [900, 2000],
      "concept_cap": null,
      "avoid": ["explaining known basics", "time-wasting hedging"]
    }
  },
  "coverage": {
    "overview": {
      "length_multiplier": 0.5,
      "scope": "1-2 core ideas plus why it matters; no edge cases or mechanism detail"
    },
    "balanced": {
      "length_multiplier": 1.0,
      "scope": "core concepts plus key support plus 1-2 examples; minimal edge cases"
    },
    "comprehensive": {
      "length_multiplier": 1.9,
      "scope": "core plus nuance, edge cases, exceptions, connections, mechanism — bounded by level.concept_cap"
    }
  },
  "composition_rule": "final_concepts = min(coverage_demands, level.concept_cap); final_word_count = level.baseline_word_count * coverage.length_multiplier"
}
```