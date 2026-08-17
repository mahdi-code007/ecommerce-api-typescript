import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { products } from "./products";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, {
        onDelete: "cascade",
      }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "restrict",
      }),

    productName: varchar("product_name", {
      length: 100,
    }).notNull(),

    unitPriceInMinorUnits: integer("unit_price_in_minor_units")
      .notNull(),

    quantity: integer("quantity")
      .notNull(),

    lineTotal: integer("line_total")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "order_items_quantity_positive",
      sql`${table.quantity} >= 1`,
    ),
    check(
      "order_items_unit_price_positive",
      sql`${table.unitPriceInMinorUnits} >= 1`,
    ),
    check(
      "order_items_line_total_positive",
      sql`${table.lineTotal} >= 1`,
    ),
  ],
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
