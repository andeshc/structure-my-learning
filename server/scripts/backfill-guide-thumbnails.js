#!/usr/bin/env node
// Backfill flat-vector guide-card thumbnails over existing guides.
//
// For every ready guide it derives a {metaphor, paletteId} spec from the stored
// title + outline and (on --commit) regenerates the cover image to a VERSIONED B2
// key (guide-illustrations/<id>-v2.png), so the public URL changes — busting CDN /
// browser caches — while the old object stays in place for rollback.
//
// Usage (run locally against the prod DB, AFTER taking your own DB backup):
//   node scripts/backfill-guide-thumbnails.js            # dry-run: derive + report only, no images
//   node scripts/backfill-guide-thumbnails.js --commit   # generate images + update illustration_path
//
// Requires the same env as the server: DATABASE_URL, FAL_KEY, B2/storage creds, and
// the guide LLM provider keys (.env is loaded below).
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { getAll } = require('../src/db');
const { setGuideIllustration } = require('../src/db/guides');
const ai = require('../src/services/ai.service');

const FALLBACK_MARKER = 'generic-guide.svg';
const CONCURRENCY = 4;
const commit = process.argv.includes('--commit');

function parseOutline(row) {
  if (!row.outline_json) return { title: row.title, sections: [], tags: null };
  try {
    return JSON.parse(row.outline_json);
  } catch {
    return { title: row.title, sections: [], tags: null };
  }
}

// Minimal concurrency pool — runs `worker` over `items`, at most `limit` in flight.
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

async function main() {
  const rows = await getAll(
    `SELECT id, title, prompt, outline_json, illustration_path, user_id
       FROM guides
      WHERE status = 'ready'
      ORDER BY created_at`
  );

  const pending = rows.filter((r) => !(r.illustration_path || '').includes('-v2.png'));
  const skipped = rows.length - pending.length;

  console.log(`Found ${rows.length} ready guides; ${skipped} already on -v2 (skipped); ${pending.length} to ${commit ? 'regenerate' : 'preview'}.`);
  if (pending.length === 0) { console.log('Nothing to do.'); process.exit(0); }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = [];
  const backup = [];
  const failures = [];
  let ok = 0;

  await runPool(pending, CONCURRENCY, async (row) => {
    const outline = parseOutline(row);
    try {
      const spec = await ai.deriveGuideThumbnailSpec({ title: row.title, outline });
      report.push({ id: row.id, title: row.title, metaphor: spec.metaphor, paletteId: spec.paletteId });

      if (!commit) {
        console.log(`  [dry] ${row.title}\n        → [${spec.paletteId}] ${spec.metaphor}`);
        return;
      }

      // Reuse the derived spec so generateGuideIllustration doesn't derive again.
      outline.thumbnail = spec;
      const newUrl = await ai.generateGuideIllustration({ guideId: row.id, outline, prompt: row.prompt });

      if (!newUrl || newUrl.includes(FALLBACK_MARKER)) {
        throw new Error('image generation returned fallback');
      }

      backup.push({ id: row.id, oldIllustrationPath: row.illustration_path, newUrl });
      await setGuideIllustration(row.id, newUrl);
      ok++;
      console.log(`  [ok]  ${row.title}\n        → [${spec.paletteId}] ${newUrl}`);
    } catch (err) {
      failures.push({ id: row.id, title: row.title, error: err.message });
      console.warn(`  [fail] ${row.title}: ${err.message}`);
    }
  });

  const reportPath = path.join(process.cwd(), `backfill-thumbnails-${commit ? 'commit' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ report, backup, failures }, null, 2));

  console.log(`\nSummary: ${commit ? `${ok} regenerated, ` : ''}${failures.length} failed, ${skipped} skipped.`);
  if (commit) console.log(`Rollback data (old illustration_path per guide) written to: ${reportPath}`);
  else console.log(`Proposed metaphors written to: ${reportPath}\nReview it, then re-run with --commit.`);

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
