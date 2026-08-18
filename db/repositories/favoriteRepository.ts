import { and, count, desc, eq } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  favoriteItems,
  products,
  type FavoriteItem,
} from "../schema";

const MAX_FAVORITE_ITEMS = 50;

type FavoriteProductSummary = {
  id: string;
  name: string;
  slug: string;
  priceInMinorUnits: number;
  stock: number;
  image: string | null;
  isActive: boolean;
};

type FavoriteItemView = {
  id: string;
  createdAt: Date;
  product: FavoriteProductSummary;
};

type AddFavoriteItemResult =
  | { ok: true; item: FavoriteItemView }
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

const mapFavoriteItemView = (row: {
  item: FavoriteItem;
  product: FavoriteProductSummary;
}): FavoriteItemView => ({
  id: row.item.id,
  createdAt: row.item.createdAt,
  product: row.product,
});

const loadItemViewById = async (
  itemId: string,
): Promise<FavoriteItemView | null> => {
  const db = getPostgresDatabase();

  const [row] = await db
    .select({
      item: favoriteItems,
      product: productSummarySelect,
    })
    .from(favoriteItems)
    .innerJoin(products, eq(favoriteItems.productId, products.id))
    .where(eq(favoriteItems.id, itemId))
    .limit(1);

  return row ? mapFavoriteItemView(row) : null;
};

const listItemsByUserId = async (
  userId: string,
): Promise<FavoriteItemView[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select({
      item: favoriteItems,
      product: productSummarySelect,
    })
    .from(favoriteItems)
    .innerJoin(products, eq(favoriteItems.productId, products.id))
    .where(eq(favoriteItems.userId, userId))
    .orderBy(desc(favoriteItems.createdAt));

  return rows.map(mapFavoriteItemView);
};

const countItemsByUserId = async (userId: string): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({
      total: count(),
    })
    .from(favoriteItems)
    .where(eq(favoriteItems.userId, userId));

  return result?.total ?? 0;
};

const findItemByUserAndProduct = async (
  userId: string,
  productId: string,
): Promise<FavoriteItem | null> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .select()
    .from(favoriteItems)
    .where(
      and(
        eq(favoriteItems.userId, userId),
        eq(favoriteItems.productId, productId),
      ),
    )
    .limit(1);

  return item ?? null;
};

const addItem = async (
  userId: string,
  productId: string,
): Promise<AddFavoriteItemResult> => {
  const existingItem = await findItemByUserAndProduct(userId, productId);

  if (existingItem) {
    return {
      ok: false,
      reason: "duplicate",
    };
  }

  const itemCount = await countItemsByUserId(userId);

  if (itemCount >= MAX_FAVORITE_ITEMS) {
    return {
      ok: false,
      reason: "limit_reached",
    };
  }

  const db = getPostgresDatabase();

  const [created] = await db
    .insert(favoriteItems)
    .values({
      userId,
      productId,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to add favorite item");
  }

  const item = await loadItemViewById(created.id);

  if (!item) {
    throw new Error("Failed to load favorite item");
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
    .delete(favoriteItems)
    .where(
      and(
        eq(favoriteItems.userId, userId),
        eq(favoriteItems.productId, productId),
      ),
    )
    .returning({
      id: favoriteItems.id,
    });

  return Boolean(deleted);
};

export {
  listItemsByUserId,
  addItem,
  removeItemByProductId,
  MAX_FAVORITE_ITEMS,
};

export type {
  FavoriteItemView,
  AddFavoriteItemResult,
};
