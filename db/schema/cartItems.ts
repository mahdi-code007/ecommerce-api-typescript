import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { carts } from "./carts";
import { products } from "./products";
import { productVariants } from "./productVariants";

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, {
        onDelete: "cascade",
      }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "restrict",
      }),

    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "restrict",
    }),

    quantity: integer("quantity")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_id_product_id_simple_unique")
      .on(table.cartId, table.productId)
      .where(sql`${table.variantId} is null`),
    uniqueIndex("cart_items_cart_id_product_id_variant_id_unique")
      .on(table.cartId, table.productId, table.variantId)
      .where(sql`${table.variantId} is not null`),
    check(
      "cart_items_quantity_positive",
      sql`${table.quantity} >= 1`,
    ),
  ],
);

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
