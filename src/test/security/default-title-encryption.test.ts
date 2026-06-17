import { describe, it, expect } from "vitest";
import { generateDefaultNoteTitle } from "@/lib/crypto-client/vault";

describe("default title generation", () => {
  it("generates title from date only, not content", () => {
    const title = generateDefaultNoteTitle();
    expect(title).toMatch(/^Note from /);
    expect(title).not.toContain("SENTINEL");
  });

  it("does not include user input", () => {
    const title = generateDefaultNoteTitle();
    expect(title.length).toBeLessThan(100);
  });
});
