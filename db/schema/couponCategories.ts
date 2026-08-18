import {
  index,
  pgTable,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { coupons } from "./coupons";

export const couponCategories = pgTable(
  "coupon_categories",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, {
        onDelete: "cascade",
      }),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    uniqueIndex("coupon_categories_coupon_id_category_id_unique").on(
      table.couponId,
      table.categoryId,
    ),
    index("coupon_categories_coupon_id_idx").on(table.couponId),
  ],
);

export type CouponCategory = typeof couponCategories.$inferSelect;
export type NewCouponCategory = typeof couponCategories.$inferInsert;
