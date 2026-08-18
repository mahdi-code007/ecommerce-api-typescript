import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { coupons } from "./coupons";
import { users } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash_on_delivery",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "paid",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    status: orderStatusEnum("status")
      .notNull()
      .default("pending"),

    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("cash_on_delivery"),

    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("unpaid"),

    subtotal: integer("subtotal")
      .notNull(),

    discountAmount: integer("discount_amount")
      .notNull()
      .default(0),

    total: integer("total")
      .notNull(),

    couponId: uuid("coupon_id").references(() => coupons.id, {
      onDelete: "restrict",
    }),

    couponCode: varchar("coupon_code", {
      length: 50,
    }),

    shippingFullName: varchar("shipping_full_name", {
      length: 50,
    }).notNull(),

    shippingPhone: varchar("shipping_phone", {
      length: 20,
    }).notNull(),

    shippingCity: varchar("shipping_city", {
      length: 100,
    }).notNull(),

    shippingDistrict: varchar("shipping_district", {
      length: 100,
    }).notNull(),

    shippingStreet: varchar("shipping_street", {
      length: 200,
    }).notNull(),

    shippingBuilding: varchar("shipping_building", {
      length: 50,
    }),

    shippingNotes: varchar("shipping_notes", {
      length: 500,
    }),

    shippingCountry: varchar("shipping_country", {
      length: 2,
    })
      .notNull()
      .default("SA"),

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
    index("orders_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("orders_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    check(
      "orders_subtotal_non_negative",
      sql`${table.subtotal} >= 0`,
    ),
    check(
      "orders_total_non_negative",
      sql`${table.total} >= 0`,
    ),
    check(
      "orders_discount_amount_non_negative",
      sql`${table.discountAmount} >= 0`,
    ),
    check(
      "orders_total_equals_subtotal_minus_discount",
      sql`${table.total} = ${table.subtotal} - ${table.discountAmount}`,
    ),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cash_on_delivery";
export type PaymentStatus = "unpaid" | "paid";
