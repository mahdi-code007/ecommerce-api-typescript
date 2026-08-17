import { and, asc, eq } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  cartItems,
  carts,
  products,
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
};

type CartItemView = {
  id: string;
  quantity: number;
  lineTotal: number;
  product: CartProductSummary;
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

const mapCartView = (
  cartId: string,
  rows: Array<{
    item: CartItem;
    product: CartProductSummary;
  }>,
): CartView => {
  const items = rows.map((row) => ({
    id: row.item.id,
    quantity: row.item.quantity,
    lineTotal: row.item.quantity * row.product.priceInMinorUnits,
    product: row.product,
  }));

  return {
    id: cartId,
    items,
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
  };
};

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
      },
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cart.id))
    .orderBy(asc(cartItems.createdAt));

  return mapCartView(cart.id, rows);
};

const findItemByProduct = async (
  cartId: string,
  productId: string,
): Promise<CartItem | null> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId),
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
): Promise<CartItem> => {
  const db = getPostgresDatabase();

  const [item] = await db
    .insert(cartItems)
    .values({
      cartId,
      productId,
      quantity,
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

export {
  getOrCreateCart,
  getCartViewByUserId,
  findItemByProduct,
  findItemInUserCart,
  insertCartItem,
  updateCartItemQuantity,
  deleteCartItem,
  clearCartByUserId,
};

export type {
  CartView,
  CartItemView,
};
