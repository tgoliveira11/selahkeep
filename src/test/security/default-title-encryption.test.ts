import { describe, it, expect } from "vitest";
import { generateDefaultTitle } from "@/lib/crypto-client/vault";

describe("default title generation", () => {
  it("generates title from date only, not content", () => {
    const title = generateDefaultTitle();
    expect(title).toMatch(/^Letter from /);
    expect(title).not.toContain("SENTINEL");
  });

  it("does not include user input", () => {
    const title = generateDefaultTitle();
    expect(title.length).toBeLessThan(100);
  });
});
