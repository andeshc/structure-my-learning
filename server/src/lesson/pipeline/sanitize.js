/**
 * Allow-list HTML sanitizer — no LLM calls.
 *
 * The generator is told it may emit html_allowed_tags only. Insertion adds
 * <figure>, <img>, and <figcaption> afterwards, so those three are added to
 * the sanitizer's allow-list as a clearly-commented superset — they are NOT
 * in content-config.json's html_allowed_tags, so the generator is never told
 * it may emit raw <img>.
 *
 * Only <img>'s src and alt attributes are passed through. All other attributes
 * on all tags are stripped (no class, id, style, on*, data-*, etc.).
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
 * @returns {string}
 */
function sanitizeNode(node, allowSet) {
  // Text node
  if (node.nodeType === 3) return node.rawText;

  const tag = node.rawTagName?.toLowerCase();
  const children = [...(node.childNodes ?? [])].map((c) => sanitizeNode(c, allowSet)).join('');

  // Root node or unknown node type — pass through children
  if (!tag) return children;

  // Disallowed tag: strip the element, preserve its text content
  if (!allowSet.has(tag)) return children;

  // img: allow only src and alt
  if (tag === 'img') {
    const src = node.getAttribute('src') ?? '';
    const alt = node.getAttribute('alt') ?? '';
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">`;
  }

  // All other allowed tags: no attributes
  return `<${tag}>${children}</${tag}>`;
}

/**
 * Sanitize an HTML string to the given allow-list plus figure/img/figcaption.
 * Strips all disallowed tags (keeping their text content) and all attributes
 * except img's src and alt.
 *
 * @param {string} html
 * @param {string[]} allowed - html_allowed_tags from ContentConfig
 * @returns {string}
 */
export function sanitizeHtml(html, allowed) {
  const allowSet = new Set([...allowed, ...INSERTION_TAGS]);
  const root = parse(html);
  return sanitizeNode(root, allowSet);
}
