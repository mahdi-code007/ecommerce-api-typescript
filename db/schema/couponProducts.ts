import {
  index,
  pgTable,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { coupons } from "./coupons";
import { products } from "./products";

export const couponProducts = pgTable(
  "coupon_products",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, {
        onDelete: "cascade",
      }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
      }),
  },
  (table) => [
    uniqueIndex("coupon_products_coupon_id_product_id_unique").on(
      table.couponId,
      table.productId,
    ),
    index("coupon_products_coupon_id_idx").on(table.couponId),
  ],
);

export type CouponProduct = typeof couponProducts.$inferSelect;
export type NewCouponProduct = typeof couponProducts.$inferInsert;
