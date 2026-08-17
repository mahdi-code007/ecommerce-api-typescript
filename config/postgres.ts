import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

type PostgresDatabase = NodePgDatabase<typeof schema>;

let database: PostgresDatabase | null = null;

const connectPostgres = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  await pool.query("SELECT 1");

  database = drizzle({
    client: pool,
    schema,
  });

  console.log("PostgreSQL Connected");
};

const getPostgresDatabase = (): PostgresDatabase => {
  if (!database) {
    throw new Error("PostgreSQL has not been connected");
  }

  return database;
};

export {
  connectPostgres,
  getPostgresDatabase,
};