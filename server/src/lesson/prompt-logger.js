import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../generated-prompts');

export function slug(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function promptLogDir(guideId) {
  return join(ROOT, String(guideId));
}

/**
 * Writes a prompt log file. Best-effort — never throws.
 * @param {string} dir
 * @param {string} filename
 * @param {{ heading: string, content: string }[]} sections
 */
export function savePromptFile(dir, filename, sections) {
  try {
    mkdirSync(dir, { recursive: true });
    const body = sections
      .map(({ heading, content }) => `## ${heading}\n\n${content}`)
      .join('\n\n---\n\n');
    writeFileSync(join(dir, filename), body + '\n');
  } catch (err) {
    console.warn('[prompt-logger] failed to save:', err.message);
  }
}
