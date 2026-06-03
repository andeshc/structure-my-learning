const { parse } = require('node-html-parser');

const CALLOUT_STYLES = {
  info: {
    div:   'bg-blue-50 border-l-4 border-blue-500 rounded-r-xl px-5 py-4 my-6',
    label: 'font-semibold text-blue-900 mb-1',
    body:  'text-blue-800 leading-relaxed',
  },
  tip: {
    div:   'bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-4 my-6',
    label: 'font-semibold text-amber-900 mb-1',
    body:  'text-amber-800 leading-relaxed',
  },
  warning: {
    div:   'bg-red-50 border-l-4 border-red-400 rounded-r-xl px-5 py-4 my-6',
    label: 'font-semibold text-red-900 mb-1',
    body:  'text-red-800 leading-relaxed',
  },
  summary: {
    div:   'bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-5 mt-10',
    label: 'font-bold text-emerald-900 mb-3',
    body:  'text-emerald-800 text-sm leading-relaxed',
  },
};

function transformHtml(html) {
  if (!html || (!html.includes('class=') && !html.includes('<figure'))) return html;

  const root = parse(html, { blockTextElements: { pre: true, code: true } });

  // 1. pre — strip all classes; nested code keeps language-* (Prism)
  root.querySelectorAll('pre').forEach(el => el.removeAttribute('class'));

  // 2. headings — strip utility classes (bare elements are styled by .lesson-content CSS)
  root.querySelectorAll('h1, h2, h3, h4').forEach(el => el.removeAttribute('class'));

  // 3. ul — strip utility classes
  root.querySelectorAll('ul').forEach(el => el.removeAttribute('class'));

  // 4. p — lead gets Tailwind; others stripped
  //    Callout children will be overridden in the div pass below
  root.querySelectorAll('p').forEach(el => {
    const cls = el.getAttribute('class') || '';
    if (cls.includes('text-lg') || cls === 'lead') {
      el.setAttribute('class', 'text-lg text-slate-600 leading-relaxed mb-8');
    } else {
      el.removeAttribute('class');
    }
  });

  // 5. spans — replace font-mono spans with inline <code> styled with Tailwind
  root.querySelectorAll('span').forEach(el => {
    if ((el.getAttribute('class') || '').includes('font-mono')) {
      const code = parse(`<code class="font-mono text-sm bg-slate-100 text-slate-900 rounded px-1 py-0.5">${el.innerHTML}</code>`).firstChild;
      el.replaceWith(code);
    } else {
      el.removeAttribute('class');
    }
  });

  // 6. divs — callouts get Tailwind; table-wrapper keeps its class; others stripped
  //    Runs after p pass so it can override p classes inside callouts
  root.querySelectorAll('div').forEach(el => {
    const cls = el.getAttribute('class') || '';
    let type = null;
    if      (cls.includes('bg-blue-50')   || cls === 'callout-info')    type = 'info';
    else if (cls.includes('bg-amber-50')  || cls === 'callout-tip')     type = 'tip';
    else if (cls.includes('bg-red-50')    || cls === 'callout-warning') type = 'warning';
    else if (cls.includes('bg-emerald-50')|| cls === 'callout-summary') type = 'summary';
    else if (cls.includes('overflow-x-auto') || cls === 'table-wrapper') {
      el.setAttribute('class', 'table-wrapper');
      return;
    } else {
      el.removeAttribute('class');
      return;
    }

    const styles = CALLOUT_STYLES[type];
    el.setAttribute('class', styles.div);

    // Apply label (first p) and body (remaining p) Tailwind classes
    const ps = el.querySelectorAll('p');
    if (ps.length > 0) {
      ps[0].setAttribute('class', styles.label);
      for (let i = 1; i < ps.length; i++) {
        ps[i].setAttribute('class', styles.body);
      }
    }
  });

  // 7. img inside figure — ensure lesson-illustration class
  root.querySelectorAll('figure img').forEach(el => {
    el.setAttribute('class', 'lesson-illustration');
  });

  // 8. ol — steps-list (CSS counter) or bare
  root.querySelectorAll('ol').forEach(el => {
    const cls = el.getAttribute('class') || '';
    if (cls.includes('space-y') || cls === 'steps-list') {
      el.setAttribute('class', 'steps-list');
      el.querySelectorAll('li').forEach(li => {
        const badge = li.querySelector('span');
        if (badge && /rounded-full/.test(badge.getAttribute('class') || '')) badge.remove();
        const inner = li.querySelector('div');
        if (inner) li.set_content(inner.innerHTML);
        li.removeAttribute('class');
      });
    } else {
      el.removeAttribute('class');
    }
  });

  return root.toString();
}

module.exports = { transformHtml };
