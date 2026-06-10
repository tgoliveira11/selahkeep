import { db, type DbClient } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { sanitizeAuditMetadata } from "@/server/policies/audit-sanitization";

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
      metadata: sanitizeAuditMetadata(metadata),
    });
  },
};
