import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

let dbInstance: Db | null = null;

function getDb(): Db {
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
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb();
    const value = instance[prop as keyof Db];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
