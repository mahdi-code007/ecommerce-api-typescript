import { sql, type SQL } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const lower = (column: AnyPgColumn): SQL => sql`lower(${column})`;

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    name: varchar("name", {
      length: 50,
    }).notNull(),

    email: varchar("email", {
      length: 255,
    }).notNull(),

    passwordHash: varchar("password_hash", {
      length: 255,
    }).notNull(),

    role: userRoleEnum("role")
      .notNull()
      .default("user"),

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
    uniqueIndex("users_email_unique").on(lower(table.email)),
    check(
      "users_name_min_length",
      sql`char_length(${table.name}) >= 3`,
    ),
    check(
      "users_email_min_length",
      sql`char_length(${table.email}) >= 5`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
