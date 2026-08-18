import {
  index,
  integer,
  pgTable,
  uuid,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { products } from "./products";

export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 50,
    }).notNull(),

    position: integer("position")
      .notNull()
      .default(0),
  },
  (table) => [
    uniqueIndex("product_options_product_id_name_unique").on(
      table.productId,
      table.name,
    ),
    index("product_options_product_id_idx").on(table.productId),
  ],
);

export type ProductOption = typeof productOptions.$inferSelect;
export type NewProductOption = typeof productOptions.$inferInsert;
