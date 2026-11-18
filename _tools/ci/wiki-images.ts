// How wiki images are published: PNG, JPEG and WebP become WebP at quality
// WEBP_QUALITY, at most MAX_SIDE pixels on the longest side (smaller ones
// keep their size), turned upright from their EXIF orientation. Only the
// first frame of an animated PNG or WebP is kept; animated images belong in
// GIFs, which are published as they are. Uses sharp (_tools/ci/package.json).

import sharp from "sharp";

export const MAX_SIDE = 1600;
export const WEBP_QUALITY = 85;
/** Recorded with each converted file in the index; changing the settings above must change it. */
export const CONVERT_NAME = `webp-${MAX_SIDE}-q${WEBP_QUALITY}`;

sharp.cache(false);

export async function toWebp(data: Buffer): Promise<Buffer> {
  return sharp(data, { failOn: "error" })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}
