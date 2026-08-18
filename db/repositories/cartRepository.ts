import { and, asc, eq, isNull } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import * as variantRepository from "./variantRepository";
import {
  cartItems,
  carts,
  products,
  productVariants,
  type Cart,
  type CartItem,
} from "../schema";

type CartProductSummary = {
  id: string;
  name: string;
  slug: string;
  priceInMinorUnits: number;
  stock: number;
  image: string | null;
  isActive: boolean;
  productType: "simple" | "variable";
};

type CartVariantSummary = {
  id: string;
  sku: string | null;
  label: string;
  priceInMinorUnits: number;
  stock: number;
};

type CartItemView = {
  id: string;
  quantity: number;
  lineTotal: number;
  product: CartProductSummary;
  variant: CartVariantSummary | null;
};

type CartView = {
  id: string | null;
  items: CartItemView[];
  subtotal: number;
};

const emptyCartView = (): CartView => ({
  id: null,
  items: [],
  subtotal: 0,
});

const findCartByUserId = async (
  userId: string,
): Promise<Cart | null> => {
  const db = getPostgresDatabase();

  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  return cart ?? null;
};

const createCart = async (userId: string): Promise<Cart> => {
  const db = getPostgresDatabase();

  const [cart] = await db
    .insert(carts)
    .values({
      userId,
    })
    .returning();

  if (!cart) {
    throw new Error("Failed to create cart");
  }

  return cart;
};

const getOrCreateCart = async (userId: string): Promise<Cart> => {
  const existingCart = await findCartByUserId(userId);

  if (existingCart) {
    return existingCart;
  }

  return createCart(userId);
};

const getCartViewByUserId = async (
  userId: string,
): Promise<CartView> => {
  const cart = await findCartByUserId(userId);

  if (!cart) {
    return emptyCartView();
  }

  const db = getPostgresDatabase();

  const rows = await db
    .select({
      item: cartItems,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceInMinorUnits: products.priceInMinorUnits,
        stock: products.stock,
        image: products.image,
        isActive: products.isActive,
        productType: products.productType,
      },
      variant: productVariants,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.createdAt));

  const variableIds = [
    ...new Set(
      rows
        .filter((row) => row.item.variantId)
        .map((row) => row.product.id),
    ),
  ];
  const detailsByProductId = new Map<
    string,
    variantRepository.ProductOptionsAndVariants
  >();

  await Promise.all(
    variableIds.map(async (productId) => {
      detailsByProductId.set(
        productId,
        await variantRepository.loadOptionsAndVariants(productId),
      );
    }),
  );

  const items: CartItemView[] = rows.map((row) => {
    const variantView = row.item.variantId
      ? detailsByProductId
          .get(row.product.id)
          ?.variants.find((variant) => variant.id === row.item.variantId)
      : undefined;
    const unitPrice = variantView
      ? variantView.priceInMinorUnits
      : row.product.priceInMinorUnits;

    return {
      id: row.item.id,
      quantity: row.item.quantity,
      lineTotal: row.item.quantity * unitPrice,
      product: row.product,
      variant: variantView
        ? {
            id: variantView.id,
            sku: variantView.sku,
            label: variantView.label,
            priceInMinorUnits: variantView.priceInMinorUnits,
            stock: variantView.stock,
          }
        : null,
    };
  });

  return {
    id: cart.id,
    items,
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
  };
};

const findItemByProduct = async (
  cartId: string,
  productId: string,
  variantId?: string,
): Promise<CartItem | null> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId),
        variantId
          ? eq(cartItems.variantId, variantId)
          : isNull(cartItems.variantId),
      ),
    )
    .limit(1);

  return item ?? null;
};

const findItemInUserCart = async (
  userId: string,
  itemId: string,
): Promise<CartItem | null> => {
  const cart = await findCartByUserId(userId);

  if (!cart) {
    return null;
  }

  const db = getPostgresDatabase();

  const [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.id, itemId),
        eq(cartItems.cartId, cart.id),
      ),
    )
    .limit(1);

  return item ?? null;
};

const insertCartItem = async (
  cartId: string,
  productId: string,
  quantity: number,
  variantId?: string,
): Promise<CartItem> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .insert(cartItems)
    .values({
      cartId,
      productId,
      quantity,
      variantId: variantId ?? null,
    })
    .returning();

  if (!item) {
    throw new Error("Failed to add cart item");
  }

  await db
    .update(carts)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(carts.id, cartId));

  return item;
};

type AddOrIncreaseCartItemResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "unavailable"
        | "out_of_stock"
        | "variant_required"
        | "no_variants"
        | "variant_not_found";
    };

const addOrIncreaseCartItem = async (
  userId: string,
  productId: string,
  quantity: number,
  variantId?: string,
): Promise<AddOrIncreaseCartItemResult> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || !product.isActive) {
    return {
      ok: false,
      reason: "unavailable",
    };
  }

  if (product.productType === "simple") {
    if (variantId) {
      return { ok: false, reason: "no_variants" };
    }

    if (product.stock < 1) {
      return { ok: false, reason: "out_of_stock" };
    }

    const cart = await getOrCreateCart(userId);
    const existingItem = await findItemByProduct(cart.id, productId);
    const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

    if (nextQuantity > product.stock) {
      return { ok: false, reason: "out_of_stock" };
    }

    if (existingItem) {
      await updateCartItemQuantity(existingItem.id, nextQuantity);
    } else {
      await insertCartItem(cart.id, productId, quantity);
    }

    return { ok: true };
  }

  if (!variantId) {
    return { ok: false, reason: "variant_required" };
  }

  const details = await variantRepository.loadOptionsAndVariants(productId);
  const variant = details.variants.find((item) => item.id === variantId);

  if (!variant || !variant.isActive) {
    return { ok: false, reason: "variant_not_found" };
  }

  if (variant.stock < 1) {
    return { ok: false, reason: "out_of_stock" };
  }

  const cart = await getOrCreateCart(userId);
  const existingItem = await findItemByProduct(cart.id, productId, variantId);
  const nextQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (nextQuantity > variant.stock) {
    return { ok: false, reason: "out_of_stock" };
  }

  if (existingItem) {
    await updateCartItemQuantity(existingItem.id, nextQuantity);
  } else {
    await insertCartItem(cart.id, productId, quantity, variantId);
  }

  return { ok: true };
};

const updateCartItemQuantity = async (
  itemId: string,
  quantity: number,
): Promise<CartItem | null> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .update(cartItems)
    .set({
      quantity,
      updatedAt: new Date(),
    })
    .where(eq(cartItems.id, itemId))
    .returning();

  if (!item) {
    return null;
  }

  await db
    .update(carts)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(carts.id, item.cartId));

  return item;
};

const getAvailableStockForCartItem = async (
  item: CartItem,
): Promise<number | null> => {
  const db = getPostgresDatabase();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, item.productId))
    .limit(1);

  if (!product || !product.isActive) {
    return null;
  }

  if (product.productType === "simple") {
    return product.stock;
  }

  if (!item.variantId) {
    return null;
  }

  const variant = await variantRepository.findVariantById(item.variantId);

  if (!variant || !variant.isActive || variant.productId !== product.id) {
    return null;
  }

  return variant.stock;
};

const deleteCartItem = async (
  itemId: string,
): Promise<CartItem | null> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .delete(cartItems)
    .where(eq(cartItems.id, itemId))
    .returning();

  if (!item) {
    return null;
  }

  await db
    .update(carts)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(carts.id, item.cartId));

  return item;
};

const clearCartByUserId = async (
  userId: string,
): Promise<void> => {
  const cart = await findCartByUserId(userId);

  if (!cart) {
    return;
  }

  const db = getPostgresDatabase();

  await db
    .delete(cartItems)
    .where(eq(cartItems.cartId, cart.id));

  await db
    .update(carts)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(carts.id, cart.id));
};

const getCartLineItemsForCoupon = async (
  userId: string,
): Promise<
  Array<{
    productId: string;
    categoryId: string;
    lineTotal: number;
  }>
> => {
  const cart = await findCartByUserId(userId);

  if (!cart) {
    return [];
  }

  const db = getPostgresDatabase();

  const rows = await db
    .select({
      productId: products.id,
      categoryId: products.categoryId,
      productPrice: products.priceInMinorUnits,
      variantPrice: productVariants.priceInMinorUnits,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.createdAt));

  return rows.map((row) => ({
    productId: row.productId,
    categoryId: row.categoryId,
    lineTotal:
      (row.variantPrice ?? row.productPrice) * row.quantity,
  }));
};

export {
  getOrCreateCart,
  getCartViewByUserId,
  getCartLineItemsForCoupon,
  getAvailableStockForCartItem,
  findItemByProduct,
  findItemInUserCart,
  insertCartItem,
  updateCartItemQuantity,
  addOrIncreaseCartItem,
  deleteCartItem,
  clearCartByUserId,
};

export type {
  CartView,
  CartItemView,
  AddOrIncreaseCartItemResult,
};
