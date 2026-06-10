import { db, type DbClient } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";

const ALLOWED_METADATA_KEYS = new Set([
  "deviceId",
  "method",
  "endpoint",
  "statusCode",
  "errorCode",
]);

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | null {
  if (!metadata) return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (ALLOWED_METADATA_KEYS.has(key)) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

export const auditRepository = {
  async record(
    eventType: string,
    userId?: string,
    metadata?: Record<string, unknown>,
    client: DbClient = db
  ) {
    await client.insert(auditEvents).values({
      userId: userId ?? null,
      eventType,
      metadata: sanitizeMetadata(metadata),
    });
  },
};
