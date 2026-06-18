import DOMPurify from 'dompurify';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';
import { useEffect, useRef } from 'react';

const PURIFY_CONFIG = {
  USE_PROFILES: { html: true, svg: true, svgFilters: true },
  ADD_TAGS: [],
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
};

function sanitize(html) {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

// Accept whichever delimiter convention the generator emits. Single-`$` is
// intentionally omitted to avoid currency false-positives (e.g. "$5 and $10").
const KATEX_DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
];

/**
 * Renders a sanitized lesson HTML fragment, then enhances the live DOM with
 * Prism syntax highlighting and KaTeX math rendering.
 *
 * Math MUST be rendered after DOMPurify + innerHTML insertion: KaTeX emits
 * heavily inline-styled spans, and PURIFY_CONFIG forbids the `style` attribute,
 * so running KaTeX directly on the mounted DOM sidesteps the sanitizer. KaTeX's
 * auto-render ignores <pre>/<code> by default, so `$`/`\` in code samples are
 * left untouched.
 */
export default function LessonContent({ html, className = 'lesson-content' }) {
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    Prism.highlightAllUnder(el);
    renderMathInElement(el, {
      delimiters: KATEX_DELIMITERS,
      throwOnError: false, // malformed LaTeX degrades to readable source text
    });
  }, [html]);

  return (
    <div
      ref={contentRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}
