import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const discountTypeEnum = pgEnum("discount_type", [
  "fixed_amount",
  "percentage",
]);

export const couponScopeEnum = pgEnum("coupon_scope", [
  "all",
  "category",
  "product",
]);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    code: varchar("code", {
      length: 50,
    })
      .notNull()
      .unique(),

    name: varchar("name", {
      length: 100,
    }).notNull(),

    description: varchar("description", {
      length: 500,
    }),

    discountType: discountTypeEnum("discount_type")
      .notNull(),

    discountValue: integer("discount_value")
      .notNull(),

    maxDiscountAmount: integer("max_discount_amount"),

    minOrderAmount: integer("min_order_amount"),

    startsAt: timestamp("starts_at", {
      withTimezone: true,
    }),

    endsAt: timestamp("ends_at", {
      withTimezone: true,
    }),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    usageLimit: integer("usage_limit"),

    usageLimitPerUser: integer("usage_limit_per_user"),

    timesUsed: integer("times_used")
      .notNull()
      .default(0),

    scope: couponScopeEnum("scope")
      .notNull()
      .default("all"),

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
    index("coupons_is_active_idx").on(table.isActive),
    check(
      "coupons_fixed_amount_discount_value",
      sql`${table.discountType} <> 'fixed_amount' OR ${table.discountValue} >= 1`,
    ),
    check(
      "coupons_percentage_discount_value",
      sql`${table.discountType} <> 'percentage' OR (${table.discountValue} >= 1 AND ${table.discountValue} <= 100)`,
    ),
    check(
      "coupons_times_used_non_negative",
      sql`${table.timesUsed} >= 0`,
    ),
  ],
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type DiscountType = "fixed_amount" | "percentage";
export type CouponScope = "all" | "category" | "product";
