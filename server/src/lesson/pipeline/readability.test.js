import { describe, it, expect } from 'vitest';
import { stripForReadability, readabilityGate } from './readability.js';

// ── stripForReadability ────────────────────────────────────────────────────────

describe('stripForReadability', () => {
  it('removes the ===IMAGES=== trailer and everything after it', () => {
    const input = '<p>Hello world.</p>\n===IMAGES===\nIMAGE_1 | placed | Caption';
    expect(stripForReadability(input)).not.toContain('===IMAGES===');
    expect(stripForReadability(input)).not.toContain('IMAGE_1');
    expect(stripForReadability(input)).not.toContain('Caption');
  });

  it('removes [[IMAGE_*]] markers', () => {
    const input = '<p>Before.</p>\n[[IMAGE_1]]\n<p>After.</p>';
    expect(stripForReadability(input)).not.toContain('[[IMAGE_');
  });

  it('removes HTML tags', () => {
    const input = '<h1>Title</h1><p>Body text here.</p>';
    const out = stripForReadability(input);
    expect(out).not.toMatch(/<[^>]+>/);
    expect(out).toContain('Title');
    expect(out).toContain('Body text here');
  });

  it('collapses multiple whitespace into single spaces', () => {
    const input = '<p>Word   another\n\nthird.</p>';
    const out = stripForReadability(input);
    expect(out).not.toMatch(/\s{2,}/);
  });

  it('trims leading and trailing whitespace', () => {
    const out = stripForReadability('  <p>text</p>  ');
    expect(out).toBe(out.trim());
  });

  it('returns plain text with no HTML tags or markers', () => {
    const input =
      '<h1>Photosynthesis</h1>\n<p>Plants make food from sunlight.</p>\n' +
      '[[IMAGE_1]]\n<p>This is how it works.</p>\n' +
      '===IMAGES===\nIMAGE_1 | placed | A leaf diagram';
    const out = stripForReadability(input);
    expect(out).not.toMatch(/<[^>]+>/);
    expect(out).not.toContain('[[IMAGE_');
    expect(out).not.toContain('===IMAGES===');
    expect(out).toContain('Photosynthesis');
    expect(out).toContain('Plants make food from sunlight');
    expect(out).toContain('This is how it works');
  });

  it('handles input with no trailer or markers', () => {
    const input = '<p>Simple text here.</p>';
    expect(stripForReadability(input)).toBe('Simple text here.');
  });

  it('handles empty string', () => {
    expect(stripForReadability('')).toBe('');
  });
});

// ── readabilityGate ────────────────────────────────────────────────────────────

describe('readabilityGate', () => {
  it('returns an object with grade (number) and pass (boolean)', () => {
    const result = readabilityGate('The cat sat on the mat.', 0, 4);
    expect(typeof result.grade).toBe('number');
    expect(typeof result.pass).toBe('boolean');
  });

  it('simple short-sentence text passes a low-FK gate (fkMax=4)', () => {
    // Short words, short sentences → low FK grade
    const text = 'The cat sat. The dog ran. The bird flew. The fish swam.';
    const { pass } = readabilityGate(text, 0, 4);
    expect(pass).toBe(true);
  });

  it('academic long-sentence text fails a low-FK gate (fkMax=4)', () => {
    // Long sentences with polysyllabic words → high FK grade
    const text =
      'The implementation of sophisticated computational optimization algorithms ' +
      'demonstrates considerable improvements in processing efficiency and throughput. ' +
      'Furthermore, the experimental validation of these methodological approaches ' +
      'substantiates the theoretical predictions concerning algorithmic complexity.';
    const { pass } = readabilityGate(text, 0, 4);
    expect(pass).toBe(false);
  });

  it('grade at exactly fkMax + 1.0 passes (boundary inclusive)', () => {
    // Construct a text whose computed grade we know is close to some fkMax.
    // Test the logic: pass = grade <= fkMax + 1.0.
    // Use a text known to give a moderate grade, then pick an fkMax that makes it pass.
    const text = 'The cat sat on the mat. The dog ran fast across the yard.';
    const { grade } = readabilityGate(text, 0, 999);
    // With fkMax = grade exactly, it should pass (grade <= grade + 1.0)
    const { pass } = readabilityGate(text, 0, grade);
    expect(pass).toBe(true);
  });

  it('grade just above fkMax + 1.0 fails', () => {
    const text =
      'Photosynthesis is the biological process whereby organisms utilize solar ' +
      'radiation to synthesize organic compounds from inorganic substrates including ' +
      'atmospheric carbon dioxide and environmental water molecules.';
    const { grade } = readabilityGate(text, 0, 0);
    // With fkMax = 0, threshold = 1.0; grade should be well above 1
    expect(grade).toBeGreaterThan(1.0);
    const { pass } = readabilityGate(text, 0, 0);
    expect(pass).toBe(false);
  });

  it('fkMin is not used in pass/fail (only fkMax matters)', () => {
    const text = 'The cat sat. The dog ran.';
    const { pass: p1 } = readabilityGate(text, 0, 4);
    const { pass: p2 } = readabilityGate(text, 10, 4);  // fkMin changed
    expect(p1).toBe(p2);
  });

  it('threshold is exactly fkMax + 1.0: pass at fkMax+0.9, fail at fkMax+1.1', () => {
    const text = 'The cat sat on the mat. The dog ran in the yard today.';
    const { grade } = readabilityGate(text, 0, 999);
    // Set fkMax so grade lands just inside the passing window
    const fkMaxPass = grade - 0.9;
    const fkMaxFail = grade - 1.1;
    expect(readabilityGate(text, 0, fkMaxPass).pass).toBe(true);
    expect(readabilityGate(text, 0, fkMaxFail).pass).toBe(false);
  });
});
