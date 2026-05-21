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
    buildInput: ({ prompt, size = 'auto', quality = 'low' }) => ({
      prompt: `Educational illustration for a learning app. Clean flat vector style, white plain background, soft colors. ${prompt}. Include labels and annotations where they aid understanding. Do not add a title, heading, or caption text to the image.`,
      image_size: size,
      num_images: 1,
      quality,
    }),
  },
};

function extractImageUrl(result) {
  return result?.data?.images?.[0]?.url || result?.images?.[0]?.url || null;
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
 * @returns {Promise<string>} Public URL of the stored image
 */
async function generateImage({ model, prompt, key, aspectRatio, size, quality }) {
  if (!config.falKey) throw new Error('FAL_KEY is not configured.');

  const adapter = MODEL_ADAPTERS[model];
  if (!adapter) {
    throw new Error(
      `Unsupported image model: "${model}". Supported models: ${Object.keys(MODEL_ADAPTERS).join(', ')}`
    );
  }

  fal.config({ credentials: config.falKey });

  const input = adapter.buildInput({ prompt, aspectRatio, size, quality });
  const result = await fal.subscribe(model, { input });

  const imageUrl = extractImageUrl(result);
  if (!imageUrl) throw new Error(`${model} did not return an image URL.`);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Could not download image from ${model}.`);

  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  if (storageService.isConfigured()) {
    return storageService.uploadImage(buffer, key);
  }

  // Local fallback — save under server/public/{key}
  const localPath = path.join(__dirname, '../../public', key);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  return `/${key}`;
}

module.exports = { generateImage, MODEL_ADAPTERS };
