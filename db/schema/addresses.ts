import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    label: varchar("label", {
      length: 50,
    }),

    fullName: varchar("full_name", {
      length: 50,
    }).notNull(),

    phone: varchar("phone", {
      length: 20,
    }).notNull(),

    city: varchar("city", {
      length: 100,
    }).notNull(),

    district: varchar("district", {
      length: 100,
    }).notNull(),

    street: varchar("street", {
      length: 200,
    }).notNull(),

    building: varchar("building", {
      length: 50,
    }),

    notes: varchar("notes", {
      length: 500,
    }),

    country: varchar("country", {
      length: 2,
    })
      .notNull()
      .default("SA"),

    isDefault: boolean("is_default")
      .notNull()
      .default(false),

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
    uniqueIndex("addresses_one_default_per_user")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
  ],
);

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
