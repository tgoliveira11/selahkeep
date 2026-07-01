/** Collects Postgres error text from drizzle/postgres.js wrappers (message + cause). */
export function collectPostgresErrorMessages(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const e = error as { message?: string; cause?: { message?: string } };
  return [e.message, e.cause?.message]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
}

/**
 * True when Postgres reports an undefined **relation** (table/view), not a missing column.
 * Matches `relation "table_name" does not exist` and ignores
 * `column "…" of relation "table_name" does not exist` (schema drift / partial migration).
 */
export function isMissingRelationError(error: unknown, relationName: string): boolean {
  const message = collectPostgresErrorMessages(error);
  if (!message) return false;
  // Column drift (partial migration) also embeds `relation "…" does not exist` in the message.
  if (/column "[^"]+" of relation/i.test(message)) return false;
  return new RegExp(`relation "${relationName}" does not exist`, "i").test(message);
}
