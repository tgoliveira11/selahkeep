import { describe, it, expect } from "vitest";
import {
  appendLifecycleEvent,
  applyNoteReopened,
  applyNoteResolved,
  buildNoteTimeline,
  buildResolvedReflection,
  createLifecycleEvent,
  hasResolvedReflectionContent,
  LIFECYCLE_EVENT_LABELS,
} from "@/lib/notes/note-lifecycle";
import { normalizeNoteMetadata } from "@/lib/notes/note-metadata";

const baseMetadata = () =>
  normalizeNoteMetadata({
    title: "Prayer",
    categoryId: null,
    tagIds: [],
    answered: false,
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-11T10:00:00.000Z",
  });

describe("note lifecycle", () => {
  it("creates lifecycle events with id and timestamp", () => {
    const event = createLifecycleEvent("resolved", "2026-06-12T00:00:00.000Z");
    expect(event.type).toBe("resolved");
    expect(event.occurredAt).toBe("2026-06-12T00:00:00.000Z");
    expect(event.id).toBeTruthy();
  });

  it("appends lifecycle events immutably", () => {
    const first = appendLifecycleEvent(undefined, "created", "2026-06-10T10:00:00.000Z");
    const second = appendLifecycleEvent(first, "resolved", "2026-06-12T00:00:00.000Z");
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
    expect(second[1].type).toBe("resolved");
  });

  it("detects resolved reflection content", () => {
    expect(hasResolvedReflectionContent(null)).toBe(false);
    expect(hasResolvedReflectionContent({ resolvedAt: "2026-06-12T00:00:00.000Z" })).toBe(false);
    expect(
      hasResolvedReflectionContent({
        resolvedAt: "2026-06-12T00:00:00.000Z",
        whatToRemember: "Peace",
      })
    ).toBe(true);
  });

  it("builds resolved reflection with trimmed optional fields", () => {
    const reflection = buildResolvedReflection({
      whatChanged: "  Situation shifted ",
      howResolved: "",
      whatToRemember: "Trust",
    });
    expect(reflection.whatChanged).toBe("Situation shifted");
    expect(reflection.howResolved).toBeUndefined();
    expect(reflection.whatToRemember).toBe("Trust");
  });

  it("applyNoteResolved sets answered and appends resolved event", () => {
    const metadata = baseMetadata();
    const updated = applyNoteResolved(metadata, {
      resolvedAt: "2026-06-12T12:00:00.000Z",
      whatChanged: "Much",
    });
    expect(updated.answered).toBe(true);
    expect(updated.resolvedReflection?.whatChanged).toBe("Much");
    expect(updated.lifecycleEvents?.some((e) => e.type === "resolved")).toBe(true);
  });

  it("applyNoteReopened clears reflection and appends reopened event", () => {
    const resolved = applyNoteResolved(baseMetadata(), {
      resolvedAt: "2026-06-12T12:00:00.000Z",
      whatToRemember: "Keep",
    });
    const reopened = applyNoteReopened(resolved);
    expect(reopened.answered).toBe(false);
    expect(reopened.resolvedReflection).toBeNull();
    expect(reopened.lifecycleEvents?.some((e) => e.type === "reopened")).toBe(true);
  });

  it("builds timeline reverse-chronologically with synthetic created", () => {
    const metadata = applyNoteResolved(baseMetadata(), null);
    const timeline = buildNoteTimeline(metadata);
    expect(timeline.length).toBeGreaterThanOrEqual(2);
    expect(timeline[0].type).toBe("resolved");
    expect(timeline.some((item) => item.type === "created")).toBe(true);
    for (const type of Object.keys(LIFECYCLE_EVENT_LABELS) as Array<keyof typeof LIFECYCLE_EVENT_LABELS>) {
      expect(LIFECYCLE_EVENT_LABELS[type]).toBeTruthy();
    }
  });

  it("sorts multiple events newest first", () => {
    const metadata = normalizeNoteMetadata({
      ...baseMetadata(),
      lifecycleEvents: [
        createLifecycleEvent("created", "2026-06-01T00:00:00.000Z"),
        createLifecycleEvent("updated", "2026-06-05T00:00:00.000Z"),
        createLifecycleEvent("resolved", "2026-06-10T00:00:00.000Z"),
      ],
    });
    const timeline = buildNoteTimeline(metadata);
    expect(timeline[0].type).toBe("resolved");
    expect(timeline[timeline.length - 1].type).toBe("created");
  });
});
