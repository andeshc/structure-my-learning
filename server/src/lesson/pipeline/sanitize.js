/**
 * Allow-list HTML sanitizer — no LLM calls.
 *
 * The generator is told it may emit html_allowed_tags only. Insertion adds
 * <figure>, <img>, and <figcaption> afterwards, so those three are added to
 * the sanitizer's allow-list as a clearly-commented superset — they are NOT
 * in content-config.json's html_allowed_tags, so the generator is never told
 * it may emit raw <img>.
 *
 * The class attribute is preserved on all allowed tags. For <img>, src, alt,
 * and class are passed through. All other attributes are stripped (no id,
 * style, on*, data-*, etc.).
 */

import { parse } from 'node-html-parser';

// Added at insertion time — must survive the sanitizer even though the
// generator never emits them.
const INSERTION_TAGS = ['figure', 'img', 'figcaption'];

/** @param {string} s */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Recursively serialize a node, keeping only allowed tags and safe attributes.
 * @param {import('node-html-parser').Node} node
 * @param {Set<string>} allowSet
 * @param {RegExp | null} codeClassRe - if set, class on <code> must match or is stripped
 * @returns {string}
 */
function sanitizeNode(node, allowSet, codeClassRe) {
  // Text node
  if (node.nodeType === 3) return node.rawText;

  const tag = node.rawTagName?.toLowerCase();
  const children = [...(node.childNodes ?? [])].map((c) => sanitizeNode(c, allowSet, codeClassRe)).join('');

  // Root node or unknown node type — pass through children
  if (!tag) return children;

  // Disallowed tag: strip the element, preserve its text content
  if (!allowSet.has(tag)) return children;

  // img: allow only src, alt, and class
  if (tag === 'img') {
    const src = node.getAttribute('src') ?? '';
    const alt = node.getAttribute('alt') ?? '';
    const cls = node.getAttribute('class');
    const clsAttr = cls ? ` class="${escapeAttr(cls)}"` : '';
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${clsAttr}>`;
  }

  // code: class must match codeClassRe when set (e.g. language-* for coding type)
  if (tag === 'code') {
    const cls = node.getAttribute('class');
    const validCls = cls && (!codeClassRe || codeClassRe.test(cls)) ? cls : null;
    const clsAttr = validCls ? ` class="${escapeAttr(validCls)}"` : '';
    return `<code${clsAttr}>${children}</code>`;
  }

  // All other allowed tags: preserve class if present, strip everything else
  const cls = node.getAttribute('class');
  const clsAttr = cls ? ` class="${escapeAttr(cls)}"` : '';
  return `<${tag}${clsAttr}>${children}</${tag}>`;
}

/**
 * Sanitize an HTML string to the given allow-list plus figure/img/figcaption.
 * Strips all disallowed tags (keeping their text content) and all attributes
 * except class (preserved on allowed tags) and img's src/alt.
 * For coding lessons, class on <code> is constrained to codeClassPattern.
 *
 * @param {string} html
 * @param {string[]} allowed - html_allowed_tags from ContentConfig
 * @param {{ codeClassPattern?: string | null }} [options]
 * @returns {string}
 */
export function sanitizeHtml(html, allowed, { codeClassPattern } = {}) {
  const allowSet = new Set([...allowed, ...INSERTION_TAGS]);
  const codeClassRe = codeClassPattern ? new RegExp(codeClassPattern) : null;
  const root = parse(html);
  return sanitizeNode(root, allowSet, codeClassRe);
}
