import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DbClient = PostgresJsDatabase<typeof schema>;

let dbInstance: DbClient | null = null;

function getDb(): DbClient {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const client = postgres(connectionString, { max: 10 });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

/** Lazy-initialized DB client so API routes can return JSON errors instead of crashing at import. */
export const db = new Proxy({} as DbClient, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof DbClient];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
