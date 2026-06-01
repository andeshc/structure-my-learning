/**
 * Deterministic image insertion — no LLM calls.
 *
 * insertImageMarkers: parse the ===IMAGES=== trailer for captions, swap each
 * [[IMAGE_<id>]] marker for a <figure> block, and strip the trailer.
 * Markers with no matching URL (unplaced or from imgs beyond max_images) are
 * removed silently.
 *
 * Canonical implementation from generation-review-prompts.md §5.
 */

/** @param {string} s */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Swap [[IMAGE_<id>]] markers for <figure> blocks and strip the trailer.
 *
 * @param {string} essay - raw generator output (HTML + markers + optional trailer)
 * @param {import('../types.js').Illustration[]} imgs - illustrations with id and url
 * @returns {string} - HTML with <figure> blocks inserted and trailer removed
 */
export function insertImageMarkers(essay, imgs) {
  const [body, trailer = ''] = essay.split(/^===IMAGES===$/m);

  /** @type {Record<string, string>} IMAGE_id → caption */
  const caption = {};
  for (const line of trailer.trim().split('\n')) {
    const parts = line.split('|').map((s) => s.trim());
    const [id, status, cap] = parts;
    if (status === 'placed' && cap) caption[id] = cap;
  }

  const urlOf = Object.fromEntries(imgs.map((i) => [`IMAGE_${i.id}`, i.url]));

  return body.trim().replace(/^\s*\[\[(IMAGE_\w+)\]\]\s*$/gm, (_m, id) => {
    if (!urlOf[id]) return '';  // unplaced or dropped marker → removed
    const cap = caption[id];
    return (
      `<figure><img src="${escapeAttr(urlOf[id])}" alt="${escapeAttr(cap ?? '')}">` +
      (cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : '') +
      `</figure>`
    );
  });
}
