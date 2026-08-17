import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    name: varchar("name", {
      length: 50,
    })
      .notNull()
      .unique(),

    slug: varchar("slug", {
      length: 100,
    })
      .notNull()
      .unique(),

    description: varchar("description", {
      length: 500,
    })
      .notNull()
      .default("No description provided"),

    image: text("image"),

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
    check(
      "categories_name_min_length",
      sql`char_length(${table.name}) >= 3`,
    ),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;