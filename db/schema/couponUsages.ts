import {
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { coupons } from "./coupons";
import { orders } from "./orders";
import { users } from "./users";

export const couponUsages = pgTable(
  "coupon_usages",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, {
        onDelete: "restrict",
      }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, {
        onDelete: "restrict",
      }),

    discountAmount: integer("discount_amount")
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("coupon_usages_order_id_unique").on(table.orderId),
    index("coupon_usages_coupon_id_idx").on(table.couponId),
    index("coupon_usages_user_id_coupon_id_idx").on(
      table.userId,
      table.couponId,
    ),
  ],
);

export type CouponUsage = typeof couponUsages.$inferSelect;
export type NewCouponUsage = typeof couponUsages.$inferInsert;
