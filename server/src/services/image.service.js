const { fal } = require('@fal-ai/client');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const storageService = require('./storage.service');

const MODEL_ADAPTERS = {
  'fal-ai/nano-banana-2': {
    buildInput: ({ prompt }) => ({
      prompt: `Educational illustration for a learning app. Clean flat vector style, white plain background, soft colors. ${prompt}. Include labels and annotations where they aid understanding. Do not add a title, heading, or caption text to the image.`,
      output_format: 'png',
      num_images: 1,
      resolution: '0.5K',
    }),
  },
  'xai/grok-imagine-image/quality/text-to-image': {
    buildInput: ({ prompt, aspectRatio = '3:2' }) => ({
      prompt,
      num_images: 1,
      aspect_ratio: aspectRatio,
      resolution: '1k',
      output_format: 'png',
    }),
  },
  'openai/gpt-image-2': {
    // When `raw` is set the prompt is used verbatim (the caller fully specifies the
    // style — e.g. flat-vector guide thumbnails). Otherwise the educational-illustration
    // wrapper is applied, as topic illustrations expect.
    buildInput: ({ prompt, size = 'auto', quality = 'low', raw = false }) => ({
      prompt: raw
        ? prompt
        : `Educational illustration for a learning app. Clean flat vector style, white plain background, soft colors. ${prompt}. Include labels and annotations where they aid understanding. Do not add a title, heading, or caption text to the image.`,
      image_size: size,
      num_images: 1,
      quality,
    }),
  },
};

function extractImageUrl(result) {
  return result?.data?.images?.[0]?.url || result?.images?.[0]?.url || null;
}

// Network / AWS-SDK errors frequently have an empty `.message` but carry the real
// signal elsewhere (node socket codes like ECONNRESET, S3 error name/code, HTTP
// status, or a wrapped `.cause`). Pull out whatever is actually present so the retry
// logs are diagnosable instead of "failed: ".
function describeError(err) {
  if (!err) return 'unknown error';
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.name && err.name !== 'Error') parts.push(`name=${err.name}`);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.Code && err.Code !== err.code) parts.push(`Code=${err.Code}`);
  const status = err.$metadata?.httpStatusCode || err.statusCode;
  if (status) parts.push(`http=${status}`);
  if (err.cause && (err.cause.message || err.cause.code)) {
    parts.push(`cause=${err.cause.message || err.cause.code}`);
  }
  return parts.length ? parts.join(' ') : `non-error: ${String(err)}`;
}

// Retry an idempotent async step a few times with linear backoff. Used for the
// download + storage-upload steps, which are transient-failure prone (network,
// B2 throttling) and — unlike the model call — safe and cheap to repeat. Without
// this, a single hiccup (more likely when two guides generate at once) drops the
// thumbnail into a silent fallback even though the model produced an image.
async function withRetry(fn, { attempts = 3, baseMs = 400, label = 'op' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        console.warn(`[image] ${label} attempt ${attempt}/${attempts} failed: ${describeError(err)}; retrying`);
        await new Promise((resolve) => setTimeout(resolve, baseMs * attempt));
      }
    }
  }
  throw new Error(`[image] ${label} failed after ${attempts} attempts: ${describeError(lastErr)}`, { cause: lastErr });
}

/**
 * Generate an image via fal.ai and store it.
 *
 * When B2 is configured, uploads to B2 and returns the CDN URL.
 * When B2 is not configured, saves to disk and returns a server-relative URL.
 *
 * @param {object} opts
 * @param {string} opts.model        - fal.ai model ID
 * @param {string} opts.prompt       - Image prompt
 * @param {string} opts.key          - Storage key, e.g. "topic-illustrations/abc.png"
 *                                     Used as B2 object key and as the local subpath under public/
 * @param {string} [opts.aspectRatio]
 * @param {string} [opts.size]
 * @param {string} [opts.quality]
 * @param {boolean} [opts.raw] - Use the prompt verbatim, skipping any per-model wrapper
 * @returns {Promise<string>} Public URL of the stored image
 */
async function generateImage({ model, prompt, key, aspectRatio, size, quality, raw }) {
  if (!config.falKey) throw new Error('FAL_KEY is not configured.');

  const adapter = MODEL_ADAPTERS[model];
  if (!adapter) {
    throw new Error(
      `Unsupported image model: "${model}". Supported models: ${Object.keys(MODEL_ADAPTERS).join(', ')}`
    );
  }

  fal.config({ credentials: config.falKey });

  const input = adapter.buildInput({ prompt, aspectRatio, size, quality, raw });
  const result = await fal.subscribe(model, { input });

  const imageUrl = extractImageUrl(result);
  if (!imageUrl) throw new Error(`${model} did not return an image URL.`);

  // Download + upload are retried independently of the (costly) model call: once the
  // model has produced an image, a transient network/storage error must not throw away
  // the result and fall back to the generic SVG.
  const buffer = await withRetry(async () => {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Could not download image from ${model} (HTTP ${imageResponse.status}).`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }, { label: `download ${key}` });

  if (storageService.isConfigured()) {
    return withRetry(() => storageService.uploadImage(buffer, key), { label: `upload ${key}` });
  }

  // Never silently write to ephemeral disk in production — it would be lost on
  // the next redeploy, leaving dangling image URLs in the DB. (Startup config
  // validation should already prevent this; this is the backstop.)
  if (config.nodeEnv === 'production') {
    throw new Error(
      'Object storage (B2) is not configured; refusing to write images to ephemeral disk in production.'
    );
  }

  // Local fallback (development only) — save under server/public/{key}
  const localPath = path.join(__dirname, '../../public', key);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  return `/${key}`;
}

module.exports = { generateImage, MODEL_ADAPTERS };
