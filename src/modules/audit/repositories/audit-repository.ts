import { db, type DbClient } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { sanitizeAuditMetadata } from "@/server/policies/audit-sanitization";
import { and, desc, eq, inArray } from "drizzle-orm";

export type AuditEventRow = {
  id: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

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

  async listForUser(
    userId: string,
    eventTypes: readonly string[],
    limit = 25,
    client: DbClient = db
  ): Promise<AuditEventRow[]> {
    if (eventTypes.length === 0) return [];

    const rows = await client
      .select({
        id: auditEvents.id,
        eventType: auditEvents.eventType,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .where(and(eq(auditEvents.userId, userId), inArray(auditEvents.eventType, [...eventTypes])))
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
    }));
  },
};
