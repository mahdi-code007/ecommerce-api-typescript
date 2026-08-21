import sharp from "sharp";

/** Longest edge for catalog/detail images. Keeps portrait and landscape under control. */
const MAX_EDGE_PX = 1600;

/** WebP quality: good visual quality for product photos without heavy files. */
const WEBP_QUALITY = 80;

/**
 * Compression effort 0–6. 4 balances CPU on upload vs file size for a learning/store API.
 */
const WEBP_EFFORT = 4;

type ProcessedProductImage = {
  buffer: Buffer;
  mimeType: "image/webp";
  extension: ".webp";
  width: number;
  height: number;
  size: number;
};

/**
 * Normalize uploaded product images before disk write.
 * - Auto-orient from EXIF (common with phone photos)
 * - Cap longest edge at 1600px without upsizing small images
 * - Store as WebP for smaller payloads to mobile/web clients
 */
const processProductImage = async (
  inputBuffer: Buffer,
): Promise<ProcessedProductImage> => {
  try {
    const { data, info } = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: WEBP_EFFORT,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    return {
      buffer: data,
      mimeType: "image/webp",
      extension: ".webp",
      width: info.width,
      height: info.height,
      size: info.size,
    };
  } catch {
    throw new Error("invalid_image_type");
  }
};

export { MAX_EDGE_PX, WEBP_EFFORT, WEBP_QUALITY, processProductImage };

export type { ProcessedProductImage };
