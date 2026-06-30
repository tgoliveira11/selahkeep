import { describe, expect, it } from "vitest";
import { isKanbanEnabled } from "@/lib/notes/kanban-config";

describe("kanban config", () => {
  it("is enabled unless explicitly false", () => {
    expect(isKanbanEnabled(undefined)).toBe(true);
    expect(isKanbanEnabled("true")).toBe(true);
    expect(isKanbanEnabled("false")).toBe(false);
  });
});
