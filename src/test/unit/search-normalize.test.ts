import { describe, it, expect } from "vitest";
import { normalizeSearchText, parseSearchTerms } from "@/lib/notes/search-normalize";

describe("search normalize", () => {
  it("is case-insensitive", () => {
    expect(normalizeSearchText("Prayer")).toBe("prayer");
  });

  it("strips accents when matching", () => {
    expect(normalizeSearchText("oração")).toBe("oracao");
  });

  it("parses multi-term AND queries", () => {
    expect(parseSearchTerms("  morning   prayer ")).toEqual(["morning", "prayer"]);
  });
});
