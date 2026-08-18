import {
  pgTable,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { productOptionValues } from "./productOptionValues";
import { productVariants } from "./productVariants";

export const productVariantValues = pgTable(
  "product_variant_values",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, {
        onDelete: "cascade",
      }),

    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => productOptionValues.id, {
        onDelete: "restrict",
      }),
  },
  (table) => [
    uniqueIndex("product_variant_values_variant_id_option_value_id_unique").on(
      table.variantId,
      table.optionValueId,
    ),
    index("product_variant_values_variant_id_idx").on(table.variantId),
  ],
);

export type ProductVariantValue = typeof productVariantValues.$inferSelect;
export type NewProductVariantValue = typeof productVariantValues.$inferInsert;
