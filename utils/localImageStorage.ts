import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const getUploadsRoot = (): string =>
  path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");

const assertPathInsideUploads = (absolutePath: string): void => {
  const root = getUploadsRoot();
  const relative = path.relative(root, absolutePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("invalid_path");
  }
};

const saveProductImage = async (
  productId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> => {
  const extension = MIME_TO_EXTENSION[mimeType];

  if (!extension) {
    throw new Error("invalid_image_type");
  }

  const filename = `${randomUUID()}${extension}`;
  const directory = path.join(getUploadsRoot(), "products", productId);

  await fs.mkdir(directory, {
    recursive: true,
  });

  const absolutePath = path.join(directory, filename);
  assertPathInsideUploads(absolutePath);
  await fs.writeFile(absolutePath, buffer);

  return `/uploads/products/${productId}/${filename}`;
};

const deleteStoredFile = async (storedPath: string): Promise<void> => {
  const relative = storedPath.replace(/^\/uploads\/?/, "");
  const absolutePath = path.resolve(getUploadsRoot(), relative);

  assertPathInsideUploads(absolutePath);

  await fs.unlink(absolutePath).catch(() => undefined);
};

const deleteProductImageDirectory = async (
  productId: string,
): Promise<void> => {
  const directory = path.join(getUploadsRoot(), "products", productId);
  assertPathInsideUploads(directory);
  await fs.rm(directory, {
    recursive: true,
    force: true,
  });
};

export {
  deleteProductImageDirectory,
  deleteStoredFile,
  saveProductImage,
};
