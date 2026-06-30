import { describe, it, expect, afterEach } from 'vitest';
import aiService from './ai.service.js';
import imageService from './image.service.js';
import contentConfig from '../config/content-config.json';

const { guideThumbnailPrompt, deriveGuideThumbnailSpec, setAiMocks } = aiService;
const { MODEL_ADAPTERS } = imageService;

const paletteIds = contentConfig.guide_thumbnail.palette.map((p) => p.id);
const firstPalette = contentConfig.guide_thumbnail.palette[0];

afterEach(() => setAiMocks({}));

describe('guideThumbnailPrompt', () => {
  it('fills metaphor, resolved palette words, and the element cap; leaves no slots', () => {
    const prompt = guideThumbnailPrompt({
      spec: { metaphor: 'a flat-vector sine ribbon', paletteId: firstPalette.id },
    });
    expect(prompt).toContain('a flat-vector sine ribbon');
    expect(prompt).toContain(firstPalette.background);
    expect(prompt).toContain(firstPalette.accent);
    expect(prompt).toContain(`at most ${contentConfig.guide_thumbnail.max_elements}`);
    expect(prompt).not.toMatch(/\{\{/);
  });

  it('includes the no-text guard and excludes the old diagram-style block', () => {
    const prompt = guideThumbnailPrompt({
      spec: { metaphor: 'a flat-vector gear', paletteId: firstPalette.id },
    });
    expect(prompt.toLowerCase()).toContain('no readable text');
    // The old illustration prompt asked for diagrams / model architecture / classroom paper.
    expect(prompt).not.toMatch(/model architecture|system diagrams|classroom-paper/i);
  });

  it('falls back to the first palette for an unknown id rather than throwing', () => {
    const prompt = guideThumbnailPrompt({ spec: { metaphor: 'x', paletteId: 'does-not-exist' } });
    expect(prompt).toContain(firstPalette.background);
  });
});

describe('deriveGuideThumbnailSpec', () => {
  it('returns a schema-valid spec via the mock path', async () => {
    setAiMocks({ deriveGuideThumbnailSpec: () => ({ metaphor: 'a flat-vector padlock and key', paletteId: paletteIds[1] }) });
    const spec = await deriveGuideThumbnailSpec({ title: 'OAuth security', outline: { sections: [] } });
    expect(spec.paletteId).toBe(paletteIds[1]);
    expect(spec.metaphor.length).toBeGreaterThanOrEqual(10);
  });

  it('rejects a paletteId outside the curated set', async () => {
    setAiMocks({ deriveGuideThumbnailSpec: () => ({ metaphor: 'a generic blob shape', paletteId: 'neon-pink' }) });
    await expect(deriveGuideThumbnailSpec({ title: 'X', outline: {} })).rejects.toThrow();
  });
});

describe('image.service openai/gpt-image-2 adapter', () => {
  const adapter = MODEL_ADAPTERS['openai/gpt-image-2'];

  it('uses the prompt verbatim when raw is set', () => {
    const input = adapter.buildInput({ prompt: 'RAW_PROMPT', raw: true });
    expect(input.prompt).toBe('RAW_PROMPT');
  });

  it('applies the educational wrapper when raw is not set', () => {
    const input = adapter.buildInput({ prompt: 'TOPIC_PROMPT' });
    expect(input.prompt).toContain('TOPIC_PROMPT');
    expect(input.prompt).toMatch(/Educational illustration/);
  });
});
