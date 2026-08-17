import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getPostgresDatabase } from "../../config/postgres";
import {
  cartItems,
  carts,
  orderItems,
  orders,
  products,
  type Address,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "../schema";

type ShippingAddressSnapshot = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string | null;
  notes: string | null;
  country: string;
};

type OrderItemView = {
  id: string;
  productId: string;
  productName: string;
  unitPriceInMinorUnits: number;
  quantity: number;
  lineTotal: number;
};

type OrderView = {
  id: string;
  status: Order["status"];
  paymentMethod: Order["paymentMethod"];
  paymentStatus: Order["paymentStatus"];
  subtotal: number;
  total: number;
  shippingAddress: ShippingAddressSnapshot;
  items: OrderItemView[];
  createdAt: Date;
  updatedAt: Date;
};

class CheckoutUnavailableError extends Error {
  constructor() {
    super("unavailable");
    this.name = "CheckoutUnavailableError";
  }
}

type PlaceOrderResult =
  | { ok: true; order: OrderView }
  | { ok: false; reason: "empty_cart" | "unavailable" };

type CancelOrderResult =
  | { ok: true; order: OrderView }
  | { ok: false; reason: "not_found" | "not_cancellable" };

type UpdateStatusResult =
  | { ok: true; order: OrderView }
  | { ok: false; reason: "not_found" | "invalid_transition" };

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const mapShippingAddress = (order: Order): ShippingAddressSnapshot => ({
  fullName: order.shippingFullName,
  phone: order.shippingPhone,
  city: order.shippingCity,
  district: order.shippingDistrict,
  street: order.shippingStreet,
  building: order.shippingBuilding,
  notes: order.shippingNotes,
  country: order.shippingCountry,
});

const mapOrderItemView = (item: OrderItem): OrderItemView => ({
  id: item.id,
  productId: item.productId,
  productName: item.productName,
  unitPriceInMinorUnits: item.unitPriceInMinorUnits,
  quantity: item.quantity,
  lineTotal: item.lineTotal,
});

const mapOrderView = (order: Order, items: OrderItem[]): OrderView => ({
  id: order.id,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  subtotal: order.subtotal,
  total: order.total,
  shippingAddress: mapShippingAddress(order),
  items: items.map(mapOrderItemView),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const groupOrders = (
  rows: Array<{ order: Order; item: OrderItem | null }>,
): OrderView[] => {
  const grouped = new Map<string, { order: Order; items: OrderItem[] }>();

  for (const row of rows) {
    const existing = grouped.get(row.order.id);

    if (!existing) {
      grouped.set(row.order.id, {
        order: row.order,
        items: row.item ? [row.item] : [],
      });
      continue;
    }

    if (row.item) {
      existing.items.push(row.item);
    }
  }

  return [...grouped.values()].map(({ order, items }) =>
    mapOrderView(order, items),
  );
};

const loadOrderItems = async (
  tx: ReturnType<typeof getPostgresDatabase>,
  orderId: string,
): Promise<OrderItem[]> => {
  return tx
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.createdAt));
};

const loadOrderViewById = async (
  tx: ReturnType<typeof getPostgresDatabase>,
  orderId: string,
): Promise<OrderView | null> => {
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return null;
  }

  const items = await loadOrderItems(tx, orderId);
  return mapOrderView(order, items);
};

const restockOrderItems = async (
  tx: ReturnType<typeof getPostgresDatabase>,
  items: OrderItem[],
): Promise<void> => {
  for (const item of items) {
    await tx
      .update(products)
      .set({
        stock: sql`${products.stock} + ${item.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, item.productId));
  }
};

const applyCancellation = async (
  tx: ReturnType<typeof getPostgresDatabase>,
  order: Order,
): Promise<OrderView> => {
  const items = await loadOrderItems(tx, order.id);
  await restockOrderItems(tx, items);

  const [updated] = await tx
    .update(orders)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to cancel order");
  }

  return mapOrderView(updated, items);
};

const placeOrder = async (
  userId: string,
  address: Address,
): Promise<PlaceOrderResult> => {
  const db = getPostgresDatabase();

  try {
    return await db.transaction(async (tx) => {
    const [cart] = await tx
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    if (!cart) {
      return { ok: false, reason: "empty_cart" };
    }

    const cartRows = await tx
      .select({
        item: cartItems,
        product: products,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(asc(cartItems.createdAt));

    if (cartRows.length === 0) {
      return { ok: false, reason: "empty_cart" };
    }

    const productIds = [...new Set(cartRows.map((row) => row.product.id))].sort();

    await tx
      .select({
        id: products.id,
      })
      .from(products)
      .where(inArray(products.id, productIds))
      .orderBy(asc(products.id))
      .for("update");

    const lockedProducts = await tx
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    const productById = new Map(
      lockedProducts.map((product) => [product.id, product]),
    );

    for (const row of cartRows) {
      const product = productById.get(row.item.productId);

      if (!product || !product.isActive || product.stock < row.item.quantity) {
        return { ok: false, reason: "unavailable" };
      }
    }

    const lineItems = cartRows.map((row) => {
      const product = productById.get(row.item.productId);

      if (!product) {
        throw new Error("Locked product missing");
      }

      const unitPriceInMinorUnits = product.priceInMinorUnits;

      return {
        productId: product.id,
        productName: product.name,
        unitPriceInMinorUnits,
        quantity: row.item.quantity,
        lineTotal: unitPriceInMinorUnits * row.item.quantity,
      };
    });

    const subtotal = lineItems.reduce(
      (total, item) => total + item.lineTotal,
      0,
    );

    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        subtotal,
        total: subtotal,
        shippingFullName: address.fullName,
        shippingPhone: address.phone,
        shippingCity: address.city,
        shippingDistrict: address.district,
        shippingStreet: address.street,
        shippingBuilding: address.building,
        shippingNotes: address.notes,
        shippingCountry: address.country,
      })
      .returning();

    if (!order) {
      throw new Error("Failed to create order");
    }

    const insertedItems = await tx
      .insert(orderItems)
      .values(
        lineItems.map((item) => ({
          orderId: order.id,
          ...item,
        })),
      )
      .returning();

    for (const item of lineItems) {
      const [updatedProduct] = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(products.id, item.productId),
            gte(products.stock, item.quantity),
          ),
        )
        .returning({
          id: products.id,
        });

      if (!updatedProduct) {
        throw new CheckoutUnavailableError();
      }
    }

    await tx
      .delete(cartItems)
      .where(eq(cartItems.cartId, cart.id));

    await tx
      .update(carts)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cart.id));

    return {
      ok: true,
      order: mapOrderView(order, insertedItems),
    };
    });
  } catch (error) {
    if (error instanceof CheckoutUnavailableError) {
      return { ok: false, reason: "unavailable" };
    }

    throw error;
  }
};

const listOrdersByUserId = async (
  userId: string,
): Promise<OrderView[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select({
      order: orders,
      item: orderItems,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt), asc(orderItems.createdAt));

  return groupOrders(rows);
};

const listAllOrders = async (): Promise<OrderView[]> => {
  const db = getPostgresDatabase();

  const rows = await db
    .select({
      order: orders,
      item: orderItems,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .orderBy(desc(orders.createdAt), asc(orderItems.createdAt));

  return groupOrders(rows);
};

const findOrderByIdForUser = async (
  userId: string,
  orderId: string,
): Promise<OrderView | null> => {
  const db = getPostgresDatabase();
  const order = await loadOrderViewById(db, orderId);

  if (!order) {
    return null;
  }

  const [owned] = await db
    .select({
      id: orders.id,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, userId),
      ),
    )
    .limit(1);

  return owned ? order : null;
};

const findOrderById = async (
  orderId: string,
): Promise<OrderView | null> => {
  const db = getPostgresDatabase();
  return loadOrderViewById(db, orderId);
};

const countOrdersByUserId = async (
  userId: string,
): Promise<number> => {
  const db = getPostgresDatabase();

  const [result] = await db
    .select({
      total: count(),
    })
    .from(orders)
    .where(eq(orders.userId, userId));

  return result?.total ?? 0;
};

const cancelPendingOrderForUser = async (
  userId: string,
  orderId: string,
): Promise<CancelOrderResult> => {
  const db = getPostgresDatabase();

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.userId, userId),
        ),
      )
      .limit(1);

    if (!order) {
      return { ok: false, reason: "not_found" };
    }

    if (order.status !== "pending") {
      return { ok: false, reason: "not_cancellable" };
    }

    return {
      ok: true,
      order: await applyCancellation(tx, order),
    };
  });
};

const updateOrderStatus = async (
  orderId: string,
  nextStatus: OrderStatus,
): Promise<UpdateStatusResult> => {
  const db = getPostgresDatabase();

  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { ok: false, reason: "not_found" };
    }

    if (!STATUS_TRANSITIONS[order.status].includes(nextStatus)) {
      return { ok: false, reason: "invalid_transition" };
    }

    if (nextStatus === "cancelled") {
      return {
        ok: true,
        order: await applyCancellation(tx, order),
      };
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: nextStatus,
        paymentStatus: nextStatus === "delivered" ? "paid" : order.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update order status");
    }

    const items = await loadOrderItems(tx, orderId);

    return {
      ok: true,
      order: mapOrderView(updated, items),
    };
  });
};

export {
  placeOrder,
  listOrdersByUserId,
  listAllOrders,
  findOrderByIdForUser,
  findOrderById,
  countOrdersByUserId,
  cancelPendingOrderForUser,
  updateOrderStatus,
};

export type {
  OrderView,
  PlaceOrderResult,
  CancelOrderResult,
  UpdateStatusResult,
};
