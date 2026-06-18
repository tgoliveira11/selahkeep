import { describe, it, expect } from "vitest";
import {
  REFLECTION_PROMPTS,
  promptsForContext,
  promptToEditorInsert,
} from "@/lib/notes/reflection-prompts";

describe("reflection prompts", () => {
  it("defines static local prompts without external URLs", () => {
    expect(REFLECTION_PROMPTS.length).toBeGreaterThanOrEqual(5);
    const serialized = JSON.stringify(REFLECTION_PROMPTS);
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toMatch(/openai|anthropic|api\./i);
  });

  it("filters prompts by context", () => {
    const newNote = promptsForContext("new-note");
    const weekly = promptsForContext("weekly-reflection");
    expect(newNote.length).toBeGreaterThan(0);
    expect(weekly.some((p) => p.id === "carry-forward")).toBe(true);
    expect(newNote.every((p) => p.context.includes("new-note"))).toBe(true);
  });

  it("inserts prompt as markdown heading", () => {
    expect(promptToEditorInsert("What am I grateful for?")).toBe(
      "## What am I grateful for?\n\n"
    );
  });

  it("includes required example prompts", () => {
    const texts = REFLECTION_PROMPTS.map((p) => p.text);
    expect(texts).toContain("What am I grateful for today?");
    expect(texts).toContain("What do I need to surrender?");
    expect(texts).toContain("What should I remember from today?");
    expect(texts).toContain("What decision needs clarity?");
  });
});
