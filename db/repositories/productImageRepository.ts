import { and, asc, count, eq } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  productImages,
  products,
  type ProductImage,
} from "../schema";
import {
  deleteProductImageDirectory,
  deleteStoredFile,
  saveProductImage,
} from "../../utils/localImageStorage";

const MAX_IMAGES_PER_PRODUCT = 9;

type ProductImageView = {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
};

type AddProductImageInput = {
  buffer: Buffer;
  mimeType: string;
};

type UpdateProductImageInput = {
  isPrimary?: boolean;
  position?: number;
};

type ProductImageWriteResult =
  | { ok: true; image: ProductImageView }
  | {
      ok: false;
      reason:
        | "not_found"
        | "limit_reached"
        | "invalid_primary"
        | "invalid_image_type";
    };

type DeleteProductImageResult =
  | { ok: true }
  | { ok: false; reason: "not_found" };

const mapImage = (image: ProductImage): ProductImageView => ({
  id: image.id,
  url: image.path,
  position: image.position,
  isPrimary: image.isPrimary,
});

const loadImagesForProduct = async (
  productId: string,
): Promise<ProductImageView[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position), asc(productImages.createdAt));

  return rows.map(mapImage);
};

const countImagesByProductId = async (productId: string): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({ total: count() })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  return result?.total ?? 0;
};

const syncPrimaryImageCache = async (productId: string): Promise<void> => {
  const db = getPostgresDatabase();
  const images = await loadImagesForProduct(productId);
  const primary = images.find((image) => image.isPrimary) ?? images[0];

  await db
    .update(products)
    .set({
      image: primary?.url ?? null,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
};

const addProductImage = async (
  productId: string,
  input: AddProductImageInput,
): Promise<ProductImageWriteResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select({
      id: products.id,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  const existing = await loadImagesForProduct(productId);

  if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
    return { ok: false, reason: "limit_reached" };
  }

  const isPrimary = existing.length === 0;
  const nextPosition =
    existing.reduce(
      (highest, image) => Math.max(highest, image.position),
      -1,
    ) + 1;

  let storedPath: string;

  try {
    storedPath = await saveProductImage(
      productId,
      input.buffer,
      input.mimeType,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_image_type") {
      return { ok: false, reason: "invalid_image_type" };
    }

    throw error;
  }

  try {
    const [created] = await db
      .insert(productImages)
      .values({
        productId,
        path: storedPath,
        position: nextPosition,
        isPrimary,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create product image");
    }

    await syncPrimaryImageCache(productId);

    return { ok: true, image: mapImage(created) };
  } catch (error) {
    await deleteStoredFile(storedPath);
    throw error;
  }
};

const updateProductImage = async (
  productId: string,
  imageId: string,
  input: UpdateProductImageInput,
): Promise<ProductImageWriteResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select({
      id: products.id,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  const [existing] = await db
    .select()
    .from(productImages)
    .where(
      and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  if (input.isPrimary === false) {
    return { ok: false, reason: "invalid_primary" };
  }

  if (input.isPrimary === true) {
    await db
      .update(productImages)
      .set({
        isPrimary: false,
      })
      .where(eq(productImages.productId, productId));
  }

  if (input.position !== undefined && input.position !== existing.position) {
    const [occupant] = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.productId, productId),
          eq(productImages.position, input.position),
        ),
      )
      .limit(1);

    if (occupant) {
      await db
        .update(productImages)
        .set({
          position: existing.position,
        })
        .where(eq(productImages.id, occupant.id));
    }
  }

  const [updated] = await db
    .update(productImages)
    .set({
      ...(input.isPrimary === true ? { isPrimary: true } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(eq(productImages.id, imageId))
    .returning();

  if (!updated) {
    return { ok: false, reason: "not_found" };
  }

  await syncPrimaryImageCache(productId);

  return { ok: true, image: mapImage(updated) };
};

const deleteProductImage = async (
  productId: string,
  imageId: string,
): Promise<DeleteProductImageResult> => {
  const db = getPostgresDatabase();
  const [existing] = await db
    .select()
    .from(productImages)
    .where(
      and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId),
      ),
    )
    .limit(1);

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  await db
    .delete(productImages)
    .where(eq(productImages.id, imageId));

  await deleteStoredFile(existing.path);

  if (existing.isPrimary) {
    const remaining = await loadImagesForProduct(productId);
    const nextPrimary = remaining[0];

    if (nextPrimary) {
      await db
        .update(productImages)
        .set({
          isPrimary: true,
        })
        .where(eq(productImages.id, nextPrimary.id));
    }
  }

  await syncPrimaryImageCache(productId);

  return { ok: true };
};

export {
  addProductImage,
  countImagesByProductId,
  deleteProductImage,
  deleteProductImageDirectory,
  loadImagesForProduct,
  updateProductImage,
};

export type {
  AddProductImageInput,
  DeleteProductImageResult,
  ProductImageView,
  ProductImageWriteResult,
  UpdateProductImageInput,
};
