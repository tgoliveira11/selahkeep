import "server-only";

import postgres, { type Sql } from "postgres";

let clientInstance: Sql | null = null;

export function getPostgresClient(): Sql {
  if (!clientInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    clientInstance = postgres(connectionString, { max: 10 });
  }

  return clientInstance;
}
