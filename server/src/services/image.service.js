const { fal } = require('@fal-ai/client');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Each adapter maps a common set of params to the model-specific fal.ai input schema.
// Add a new entry here to support a new model; set the env var to activate it.
const MODEL_ADAPTERS = {
  'fal-ai/nano-banana-2': {
    buildInput: ({ prompt }) => ({
      // Nano-banana is used for inline lesson illustrations — wrap prompt with style guidance
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
 * Generate an image via fal.ai and save it to disk.
 *
 * @param {object} opts
 * @param {string} opts.model       - fal.ai model ID (must exist in MODEL_ADAPTERS)
 * @param {string} opts.prompt      - Image prompt
 * @param {string} opts.outputDir   - Absolute directory to save the file
 * @param {string} opts.filename    - File name (including extension)
 * @param {string} [opts.aspectRatio] - e.g. '3:2' (passed to adapter if supported)
 * @param {string} [opts.size]      - e.g. '1024x1024' (passed to adapter if supported)
 * @param {string} [opts.quality]   - e.g. 'medium' (passed to adapter if supported)
 * @returns {Promise<string>} Absolute path of the saved file
 */
async function generateImage({ model, prompt, outputDir, filename, aspectRatio, size, quality }) {
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

  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, Buffer.from(await imageResponse.arrayBuffer()));

  return outputPath;
}

module.exports = { generateImage, MODEL_ADAPTERS };
