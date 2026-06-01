import { describe, it, expect, beforeAll } from 'vitest';
import { sanitizeHtml } from './sanitize.js';
import { loadConfig, _resetCache } from '../config/load.js';

let allowed;
beforeAll(() => {
  _resetCache();
  allowed = loadConfig().html_allowed_tags;
});

// ── allowed tags ───────────────────────────────────────────────────────────────

describe('sanitizeHtml — allowed tags', () => {
  it('passes a <p> tag through', () => {
    expect(sanitizeHtml('<p>Hello world.</p>', allowed)).toContain('<p>');
  });

  it('passes <h1>, <h2>, <h3> through', () => {
    const html = '<h1>Title</h1><h2>Sub</h2><h3>Subsub</h3>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<h1>');
    expect(out).toContain('<h2>');
    expect(out).toContain('<h3>');
  });

  it('passes <ul> / <ol> / <li> through', () => {
    const html = '<ul><li>Item one</li><li>Item two</li></ul>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<ul>');
    expect(out).toContain('<li>');
  });

  it('passes <strong> and <em> through', () => {
    const html = '<p><strong>bold</strong> and <em>italic</em></p>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>italic</em>');
  });

  it('passes <blockquote>, <code>, <pre> through', () => {
    const html = '<blockquote><p>Quote.</p></blockquote><pre><code>x = 1</code></pre>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<blockquote>');
    expect(out).toContain('<pre>');
    expect(out).toContain('<code>');
  });

  it('passes table family through', () => {
    const html = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<table>');
    expect(out).toContain('<thead>');
    expect(out).toContain('<tbody>');
    expect(out).toContain('<tr>');
    expect(out).toContain('<th>A</th>');
    expect(out).toContain('<td>B</td>');
  });

  it('preserves text content of allowed tags', () => {
    const out = sanitizeHtml('<p>Keep this text.</p>', allowed);
    expect(out).toContain('Keep this text.');
  });
});

// ── superset: figure / img / figcaption ───────────────────────────────────────

describe('sanitizeHtml — insertion superset (figure/img/figcaption)', () => {
  it('passes <figure> through even though it is not in html_allowed_tags', () => {
    const html = '<figure><img src="x.png" alt="desc"><figcaption>Caption</figcaption></figure>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<figure>');
  });

  it('passes <figcaption> through', () => {
    const html = '<figure><img src="x.png" alt="desc"><figcaption>Caption text</figcaption></figure>';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('<figcaption>Caption text</figcaption>');
  });

  it('passes <img> through with src and alt', () => {
    const html = '<img src="https://example.com/img.png" alt="Description">';
    const out = sanitizeHtml(html, allowed);
    expect(out).toContain('src="https://example.com/img.png"');
    expect(out).toContain('alt="Description"');
  });

  it('strips onclick from <img>', () => {
    const html = '<img src="a.png" alt="b" onclick="evil()">';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('onclick');
  });

  it('strips width/height from <img>', () => {
    const html = '<img src="a.png" alt="b" width="100" height="50">';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('width');
    expect(out).not.toContain('height');
  });
});

// ── disallowed tags ────────────────────────────────────────────────────────────

describe('sanitizeHtml — disallowed tags stripped', () => {
  it('strips <script> but preserves its text content', () => {
    const html = '<p>Before.</p><script>alert("xss")</script><p>After.</p>';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('<script>');
    expect(out).toContain('Before.');
    expect(out).toContain('After.');
  });

  it('strips <style>', () => {
    const html = '<style>body { color: red }</style><p>Text.</p>';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('<style>');
  });

  it('strips <div> but preserves its children', () => {
    const html = '<div><p>Inside a div.</p></div>';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('<div>');
    expect(out).toContain('<p>Inside a div.</p>');
  });

  it('strips <span> but preserves text', () => {
    const html = '<p>Hello <span>world</span>!</p>';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('<span>');
    expect(out).toContain('Hello');
    expect(out).toContain('world');
  });

  it('strips nested disallowed tags, retaining innermost allowed tags', () => {
    const html = '<div><section><p>Deep text.</p></section></div>';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('<div>');
    expect(out).not.toContain('<section>');
    expect(out).toContain('<p>Deep text.</p>');
  });
});

// ── attribute stripping ────────────────────────────────────────────────────────

describe('sanitizeHtml — attribute stripping on allowed tags', () => {
  it('preserves class attribute', () => {
    const out = sanitizeHtml('<p class="lead">Text.</p>', allowed);
    expect(out).toContain('class="lead"');
  });

  it('strips id attribute', () => {
    const out = sanitizeHtml('<h2 id="section-1">Heading</h2>', allowed);
    expect(out).not.toContain('id=');
  });

  it('strips style attribute', () => {
    const out = sanitizeHtml('<p style="color:red">Text.</p>', allowed);
    expect(out).not.toContain('style=');
  });

  it('strips data-* attributes', () => {
    const out = sanitizeHtml('<p data-foo="bar">Text.</p>', allowed);
    expect(out).not.toContain('data-');
  });

  it('strips href from any element (no <a> tag on allow-list)', () => {
    const html = '<a href="https://evil.com">Click me</a>';
    const out = sanitizeHtml(html, allowed);
    expect(out).not.toContain('<a');
    expect(out).not.toContain('href');
    expect(out).toContain('Click me');  // text preserved
  });
});

// ── full-pipeline example ──────────────────────────────────────────────────────

describe('sanitizeHtml — full lesson-like output', () => {
  it('cleans a typical lesson HTML fragment with figure insertion', () => {
    const html =
      '<h1 class="title">Photosynthesis</h1>' +
      '<p>Plants <strong>convert</strong> sunlight into energy.</p>' +
      '<figure>' +
        '<img src="https://cdn.example.com/leaf.png" alt="Leaf cross-section" onclick="evil()">' +
        '<figcaption>A leaf cross-section showing chloroplasts.</figcaption>' +
      '</figure>' +
      '<p style="margin-top:2rem">No inline styles here.</p>' +
      '<script>alert("xss")</script>';

    const out = sanitizeHtml(html, allowed);

    expect(out).toContain('<h1 class="title">Photosynthesis</h1>');
    expect(out).toContain('<strong>convert</strong>');
    expect(out).toContain('<figure>');
    expect(out).toContain('src="https://cdn.example.com/leaf.png"');
    expect(out).toContain('alt="Leaf cross-section"');
    expect(out).not.toContain('onclick');
    expect(out).toContain('<figcaption>A leaf cross-section showing chloroplasts.</figcaption>');
    expect(out).toContain('<p>No inline styles here.</p>');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('style=');
  });
});
