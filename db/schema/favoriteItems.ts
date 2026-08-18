import {
  index,
  pgTable,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { users } from "./users";

export const favoriteItems = pgTable(
  "favorite_items",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("favorite_items_user_id_product_id_unique").on(
      table.userId,
      table.productId,
    ),
    index("favorite_items_user_id_idx").on(table.userId),
  ],
);

export type FavoriteItem = typeof favoriteItems.$inferSelect;
export type NewFavoriteItem = typeof favoriteItems.$inferInsert;
