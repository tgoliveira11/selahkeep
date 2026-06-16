import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { authSchema as packageAuthSchema } from "@tgoliveira/secure-auth/drizzle/schema";
import { getPostgresClient } from "@/lib/db/postgres-client";
import * as appSchema from "./app-schema";

const { passkeyCredentials: _packagePasskeys, ...packageTables } = packageAuthSchema;

export const schema = {
  ...packageTables,
  ...appSchema,
};

export type DbClient = PostgresJsDatabase<typeof schema>;

let dbInstance: DbClient | null = null;

function getDb(): DbClient {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    dbInstance = drizzle(getPostgresClient(), { schema });
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
