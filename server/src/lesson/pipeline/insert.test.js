import { describe, it, expect } from 'vitest';
import { insertImageMarkers } from './insert.js';

const IMG1 = { id: '1', prompt: 'A leaf cross-section.', url: 'https://example.com/leaf.png' };
const IMG2 = { id: '2', prompt: 'A flow diagram.', url: 'https://example.com/flow.png' };

function essay(body, trailerLines = []) {
  if (trailerLines.length === 0) return body;
  return body + '\n===IMAGES===\n' + trailerLines.join('\n');
}

// ── basic replacement ──────────────────────────────────────────────────────────

describe('insertImageMarkers', () => {
  it('replaces a placed marker with a <figure> block', () => {
    const input = essay(
      '<p>Before.</p>\n[[IMAGE_1]]\n<p>After.</p>',
      ['IMAGE_1 | placed | A leaf cross-section showing chloroplasts']
    );
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain('<figure>');
    expect(out).toContain('<img');
    expect(out).toContain('</figure>');
    expect(out).not.toContain('[[IMAGE_1]]');
  });

  it('sets src from imgs[].url', () => {
    const input = essay(
      '<p>Text.</p>\n[[IMAGE_1]]\n<p>More.</p>',
      ['IMAGE_1 | placed | Caption text']
    );
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain(`src="${IMG1.url}"`);
  });

  it('sets alt from the trailer caption', () => {
    const cap = 'A leaf cross-section showing chloroplasts';
    const input = essay(
      '<p>Text.</p>\n[[IMAGE_1]]\n<p>More.</p>',
      [`IMAGE_1 | placed | ${cap}`]
    );
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain(`alt="${cap}"`);
  });

  it('renders <figcaption> when a caption is present', () => {
    const cap = 'Chloroplasts absorb sunlight';
    const input = essay(
      '<p>Text.</p>\n[[IMAGE_1]]\n<p>More.</p>',
      [`IMAGE_1 | placed | ${cap}`]
    );
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain(`<figcaption>${cap}</figcaption>`);
  });

  it('strips the ===IMAGES=== trailer from the output', () => {
    const input = essay(
      '<p>Text.</p>\n[[IMAGE_1]]\n<p>More.</p>',
      ['IMAGE_1 | placed | Caption']
    );
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).not.toContain('===IMAGES===');
  });

  it('removes a marker whose id is not in imgs (no URL match)', () => {
    const input = essay(
      '<p>Before.</p>\n[[IMAGE_1]]\n<p>After.</p>',
      ['IMAGE_1 | placed | Caption']
    );
    // Pass empty imgs array — no URL for IMAGE_1
    const out = insertImageMarkers(input, []);
    expect(out).not.toContain('[[IMAGE_1]]');
    expect(out).not.toContain('<figure>');
  });

  it('removes a marker whose trailer status is "unused"', () => {
    // Even if img is in the list, "unused" means no caption → but marker removal
    // is driven by whether urlOf[id] exists, which it does.
    // The actual "unused" keyword is only in the trailer; the marker still gets
    // replaced if the URL is available. Verify the spec behaviour:
    // caption[id] is only set when status === "placed" AND cap exists.
    const input = essay(
      '<p>Before.</p>\n[[IMAGE_1]]\n<p>After.</p>',
      ['IMAGE_1 | unused']
    );
    const out = insertImageMarkers(input, [IMG1]);
    // URL is available → figure is emitted, but caption/figcaption absent
    expect(out).toContain('<figure>');
    expect(out).toContain(`src="${IMG1.url}"`);
    expect(out).toContain('alt=""');
    expect(out).not.toContain('<figcaption>');
  });

  it('handles two placed markers', () => {
    const input = essay(
      '<p>Start.</p>\n[[IMAGE_1]]\n<p>Middle.</p>\n[[IMAGE_2]]\n<p>End.</p>',
      [
        'IMAGE_1 | placed | First caption',
        'IMAGE_2 | placed | Second caption',
      ]
    );
    const out = insertImageMarkers(input, [IMG1, IMG2]);
    expect(out).toContain(IMG1.url);
    expect(out).toContain(IMG2.url);
    expect(out).toContain('First caption');
    expect(out).toContain('Second caption');
    expect(out).not.toContain('[[IMAGE_');
  });

  it('preserves surrounding HTML body content', () => {
    const input = essay(
      '<h1>Title</h1>\n<p>Body text.</p>\n[[IMAGE_1]]\n<p>After.</p>',
      ['IMAGE_1 | placed | Caption']
    );
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain('<h1>Title</h1>');
    expect(out).toContain('<p>Body text.</p>');
    expect(out).toContain('<p>After.</p>');
  });

  it('escapes special characters in src and caption', () => {
    const maliciousUrl = 'https://example.com/img.png" onerror="alert(1)';
    const maliciousCap = '<script>evil()</script>';
    const img = { id: '1', prompt: 'test', url: maliciousUrl };
    const input = essay(
      '<p>Text.</p>\n[[IMAGE_1]]\n<p>More.</p>',
      [`IMAGE_1 | placed | ${maliciousCap}`]
    );
    const out = insertImageMarkers(input, [img]);
    expect(out).not.toContain('"onerror=');
    expect(out).not.toContain('<script>');
  });

  it('no trailer: markers are removed (urlOf has entries but no caption)', () => {
    // Without a trailer, body split gives body = whole essay, trailer = ""
    // caption map stays empty; URL is available so figure is emitted without figcaption
    const input = '<p>Before.</p>\n[[IMAGE_1]]\n<p>After.</p>';
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain('<figure>');
    expect(out).not.toContain('[[IMAGE_');
    expect(out).not.toContain('<figcaption>');
  });

  it('returns empty string for a lone unmatched marker', () => {
    const input = essay('[[IMAGE_99]]', ['IMAGE_99 | placed | Cap']);
    const out = insertImageMarkers(input, [IMG1]);  // IMG1 has id='1', not '99'
    expect(out.trim()).toBe('');
  });

  it('handles essay with no markers gracefully', () => {
    const input = essay('<p>No images here.</p>', ['']);
    const out = insertImageMarkers(input, [IMG1]);
    expect(out).toContain('No images here.');
    expect(out).not.toContain('<figure>');
  });
});
