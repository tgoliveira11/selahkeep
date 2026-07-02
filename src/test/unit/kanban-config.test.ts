import { describe, expect, it } from "vitest";
import { isKanbanEnabled } from "@/lib/notes/kanban-config";

describe("kanban config", () => {
  it("is enabled unless explicitly false", () => {
    expect(isKanbanEnabled({})).toBe(true);
    expect(isKanbanEnabled({ NEXT_PUBLIC_KANBAN_ENABLED: "true" })).toBe(true);
    expect(isKanbanEnabled({ NEXT_PUBLIC_KANBAN_ENABLED: "false" })).toBe(false);
    expect(isKanbanEnabled({ KANBAN_ENABLED: "false", NEXT_PUBLIC_KANBAN_ENABLED: "true" })).toBe(
      false
    );
    expect(isKanbanEnabled({ KANBAN_ENABLED: "true", NEXT_PUBLIC_KANBAN_ENABLED: "false" })).toBe(
      true
    );
  });
});
