import type { NoteMetadataPlaintext } from "@/lib/crypto-client/notes";

export type NoteLifecycleEventType =
  | "created"
  | "updated"
  | "resolved"
  | "reopened"
  | "archived"
  | "unarchived"
  | "trashed"
  | "restored"
  | "duplicated";

export type NoteLifecycleEvent = {
  id: string;
  type: NoteLifecycleEventType;
  occurredAt: string;
};

export type ResolvedReflection = {
  resolvedAt: string;
  whatChanged?: string;
  howResolved?: string;
  whatToRemember?: string;
};

export type TimelineItem = {
  id: string;
  type: NoteLifecycleEventType;
  occurredAt: string;
  label: string;
};

/** User-facing labels for lifecycle timeline (reverse-chronological display). */
export const LIFECYCLE_EVENT_LABELS: Record<NoteLifecycleEventType, string> = {
  created: "Created",
  updated: "Updated",
  resolved: "Marked as resolved",
  reopened: "Reopened",
  archived: "Archived",
  unarchived: "Unarchived",
  trashed: "Moved to trash",
  restored: "Restored from trash",
  duplicated: "Duplicated",
};

export function createLifecycleEvent(
  type: NoteLifecycleEventType,
  occurredAt = new Date().toISOString()
): NoteLifecycleEvent {
  return { id: crypto.randomUUID(), type, occurredAt };
}

export function appendLifecycleEvent(
  events: NoteLifecycleEvent[] | undefined,
  type: NoteLifecycleEventType,
  occurredAt = new Date().toISOString()
): NoteLifecycleEvent[] {
  return [...(events ?? []), createLifecycleEvent(type, occurredAt)];
}

/** Build display timeline: synthetic created + stored events, newest first. */
export function buildNoteTimeline(metadata: NoteMetadataPlaintext): TimelineItem[] {
  const stored = metadata.lifecycleEvents ?? [];
  const hasCreated = stored.some((event) => event.type === "created");
  const items: TimelineItem[] = [];

  if (!hasCreated && metadata.createdAt) {
    items.push({
      id: `created-${metadata.createdAt}`,
      type: "created",
      occurredAt: metadata.createdAt,
      label: LIFECYCLE_EVENT_LABELS.created,
    });
  }

  for (const event of stored) {
    items.push({
      id: event.id,
      type: event.type,
      occurredAt: event.occurredAt,
      label: LIFECYCLE_EVENT_LABELS[event.type],
    });
  }

  return items.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
}

export function hasResolvedReflectionContent(
  reflection: ResolvedReflection | null | undefined
): boolean {
  if (!reflection) return false;
  return Boolean(
    reflection.whatChanged?.trim() ||
      reflection.howResolved?.trim() ||
      reflection.whatToRemember?.trim()
  );
}

export function buildResolvedReflection(
  fields: {
    whatChanged?: string;
    howResolved?: string;
    whatToRemember?: string;
  },
  resolvedAt = new Date().toISOString()
): ResolvedReflection {
  return {
    resolvedAt,
    whatChanged: fields.whatChanged?.trim() || undefined,
    howResolved: fields.howResolved?.trim() || undefined,
    whatToRemember: fields.whatToRemember?.trim() || undefined,
  };
}

/** Apply resolve transition with optional reflection and lifecycle event. */
export function applyNoteResolved(
  metadata: NoteMetadataPlaintext,
  reflection?: ResolvedReflection | null
): NoteMetadataPlaintext {
  const now = new Date().toISOString();
  return {
    ...metadata,
    answered: true,
    resolvedReflection: reflection ?? metadata.resolvedReflection ?? null,
    lifecycleEvents: appendLifecycleEvent(metadata.lifecycleEvents, "resolved", now),
    updatedAt: now,
  };
}

/** Apply reopen transition — clears current reflection for MVP. */
export function applyNoteReopened(metadata: NoteMetadataPlaintext): NoteMetadataPlaintext {
  const now = new Date().toISOString();
  return {
    ...metadata,
    answered: false,
    resolvedReflection: null,
    lifecycleEvents: appendLifecycleEvent(metadata.lifecycleEvents, "reopened", now),
    updatedAt: now,
  };
}
