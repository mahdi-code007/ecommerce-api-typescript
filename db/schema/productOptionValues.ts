import {
  index,
  integer,
  pgTable,
  uuid,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { productOptions } from "./productOptions";

export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    optionId: uuid("option_id")
      .notNull()
      .references(() => productOptions.id, {
        onDelete: "cascade",
      }),

    value: varchar("value", {
      length: 50,
    }).notNull(),

    position: integer("position")
      .notNull()
      .default(0),
  },
  (table) => [
    uniqueIndex("product_option_values_option_id_value_unique").on(
      table.optionId,
      table.value,
    ),
    index("product_option_values_option_id_idx").on(table.optionId),
  ],
);

export type ProductOptionValue = typeof productOptionValues.$inferSelect;
export type NewProductOptionValue = typeof productOptionValues.$inferInsert;
