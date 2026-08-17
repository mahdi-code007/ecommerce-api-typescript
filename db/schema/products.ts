import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const products = pgTable(
  "products",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    name: varchar("name", {
      length: 100,
    })
      .notNull()
      .unique(),

    slug: varchar("slug", {
      length: 150,
    })
      .notNull()
      .unique(),

    description: varchar("description", {
      length: 2000,
    }),

    priceInMinorUnits: integer("price_in_minor_units")
      .notNull(),

    stock: integer("stock")
      .notNull(),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "restrict",
      }),

    image: text("image"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    ratingAverage: doublePrecision("rating_average")
      .notNull()
      .default(0),

    ratingsCount: integer("ratings_count")
      .notNull()
      .default(0),

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
    index("products_category_id_idx").on(table.categoryId),
    check(
      "products_name_min_length",
      sql`char_length(${table.name}) >= 3`,
    ),
    check(
      "products_price_positive",
      sql`${table.priceInMinorUnits} >= 1`,
    ),
    check(
      "products_stock_non_negative",
      sql`${table.stock} >= 0`,
    ),
    check(
      "products_rating_average_range",
      sql`${table.ratingAverage} >= 0 AND ${table.ratingAverage} <= 5`,
    ),
    check(
      "products_ratings_count_non_negative",
      sql`${table.ratingsCount} >= 0`,
    ),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
