import { and, count, desc, eq } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  products,
  wishlistItems,
  type WishlistItem,
} from "../schema";

const MAX_WISHLIST_ITEMS = 50;

type WishlistProductSummary = {
  id: string;
  name: string;
  slug: string;
  priceInMinorUnits: number;
  stock: number;
  image: string | null;
  isActive: boolean;
};

type WishlistItemView = {
  id: string;
  createdAt: Date;
  product: WishlistProductSummary;
};

type AddWishlistItemResult =
  | { ok: true; item: WishlistItemView }
  | { ok: false; reason: "duplicate" | "limit_reached" };

const productSummarySelect = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  priceInMinorUnits: products.priceInMinorUnits,
  stock: products.stock,
  image: products.image,
  isActive: products.isActive,
};

const mapWishlistItemView = (row: {
  item: WishlistItem;
  product: WishlistProductSummary;
}): WishlistItemView => ({
  id: row.item.id,
  createdAt: row.item.createdAt,
  product: row.product,
});

const loadItemViewById = async (
  itemId: string,
): Promise<WishlistItemView | null> => {
  const db = getPostgresDatabase();

  const [row] = await db
    .select({
      item: wishlistItems,
      product: productSummarySelect,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.id, itemId))
    .limit(1);

  return row ? mapWishlistItemView(row) : null;
};

const listItemsByUserId = async (
  userId: string,
): Promise<WishlistItemView[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select({
      item: wishlistItems,
      product: productSummarySelect,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));

  return rows.map(mapWishlistItemView);
};

const countItemsByUserId = async (userId: string): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({
      total: count(),
    })
    .from(wishlistItems)
    .where(eq(wishlistItems.userId, userId));

  return result?.total ?? 0;
};

const findItemByUserAndProduct = async (
  userId: string,
  productId: string,
): Promise<WishlistItem | null> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .select()
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.productId, productId),
      ),
    )
    .limit(1);

  return item ?? null;
};

const addItem = async (
  userId: string,
  productId: string,
): Promise<AddWishlistItemResult> => {
  const existingItem = await findItemByUserAndProduct(userId, productId);

  if (existingItem) {
    return {
      ok: false,
      reason: "duplicate",
    };
  }

  const itemCount = await countItemsByUserId(userId);

  if (itemCount >= MAX_WISHLIST_ITEMS) {
    return {
      ok: false,
      reason: "limit_reached",
    };
  }

  const db = getPostgresDatabase();

  const [created] = await db
    .insert(wishlistItems)
    .values({
      userId,
      productId,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to add wishlist item");
  }

  const item = await loadItemViewById(created.id);

  if (!item) {
    throw new Error("Failed to load wishlist item");
  }

  return {
    ok: true,
    item,
  };
};

const removeItemByProductId = async (
  userId: string,
  productId: string,
): Promise<boolean> => {
  const db = getPostgresDatabase();

  const [deleted] = await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.productId, productId),
      ),
    )
    .returning({
      id: wishlistItems.id,
    });

  return Boolean(deleted);
};

export {
  listItemsByUserId,
  addItem,
  removeItemByProductId,
  MAX_WISHLIST_ITEMS,
};

export type {
  WishlistItemView,
  AddWishlistItemResult,
};
