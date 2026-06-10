import "server-only";
import { db } from "./index";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

export type DbClient = PostgresJsDatabase<typeof schema>;

/** Runs multiple repository writes atomically; rolls back on failure. */
export async function runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
