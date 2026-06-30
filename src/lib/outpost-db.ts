import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { outpostSchema, type OutpostDb } from "@tgoliveira/outpost/drizzle";
import { getPostgresClient } from "@/lib/db/postgres-client";

let dbInstance: OutpostDb | null = null;

function initOutpostDb(): OutpostDb {
  if (!dbInstance) {
    dbInstance = drizzle(getPostgresClient(), { schema: outpostSchema }) as OutpostDb;
  }
  return dbInstance;
}

export const outpostDb = new Proxy({} as OutpostDb, {
  get(_target, prop) {
    const instance = initOutpostDb();
    const value = instance[prop as keyof PostgresJsDatabase<typeof outpostSchema>];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
