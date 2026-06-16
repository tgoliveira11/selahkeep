import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { authSchema, type AuthSchema } from "@tgoliveira/secure-auth/drizzle/schema";
import { getPostgresClient } from "@/lib/db/postgres-client";

export type SecureAuthDbClient = PostgresJsDatabase<AuthSchema>;

let dbInstance: SecureAuthDbClient | null = null;

function initSecureAuthDb(): SecureAuthDbClient {
  if (!dbInstance) {
    // The package owns the auth schema definitions; we only provide the DB connection.
    dbInstance = drizzle(getPostgresClient(), { schema: authSchema });
  }

  return dbInstance;
}

/**
 * Lazy proxy so route imports never crash at module-evaluation time.
 * (Matches the pattern we use for `src/lib/db/index.ts`.)
 */
export const secureAuthDb = new Proxy({} as SecureAuthDbClient, {
  get(_target, prop) {
    const instance = initSecureAuthDb();
    const value = instance[prop as keyof SecureAuthDbClient];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
