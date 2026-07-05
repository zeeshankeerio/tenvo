import 'server-only';

import sharp from 'sharp';

/** @typedef {{ suffix: string, maxWidth: number, quality: number }} ImageVariantSpec */

/** Product upload variants — pre-sized WebP for CDN cache hits. */
export const PRODUCT_UPLOAD_VARIANTS = [
  { suffix: '-thumb', maxWidth: 256, quality: 72 },
  { suffix: '-card', maxWidth: 512, quality: 78 },
  { suffix: '', maxWidth: 1200, quality: 82 },
];

/**
 * Generate WebP buffers at multiple widths from a source image.
 * @param {Buffer} sourceBuffer
 * @param {ImageVariantSpec[]} [variants]
 * @returns {Promise<Array<{ suffix: string, buffer: Buffer, width: number, height: number }>>}
 */
export async function buildImageVariantBuffers(sourceBuffer, variants = PRODUCT_UPLOAD_VARIANTS) {
  const results = [];

  for (const spec of variants) {
    const pipeline = sharp(sourceBuffer).rotate().resize({
      width: spec.maxWidth,
      height: spec.maxWidth,
      fit: 'inside',
      withoutEnlargement: true,
    });

    const { data, info } = await pipeline.webp({ quality: spec.quality }).toBuffer({
      resolveWithObject: true,
    });

    results.push({
      suffix: spec.suffix,
      buffer: data,
      width: info.width,
      height: info.height,
    });
  }

  return results;
}

/**
 * @param {string} uniqueName
 * @param {string} suffix
 * @returns {string}
 */
export function buildVariantFileName(uniqueName, suffix) {
  if (!suffix) return uniqueName;
  const dot = uniqueName.lastIndexOf('.');
  if (dot === -1) return `${uniqueName}${suffix}.webp`;
  const base = uniqueName.slice(0, dot);
  const ext = uniqueName.slice(dot);
  return `${base}${suffix}${ext.endsWith('.webp') ? ext : '.webp'}`;
}
