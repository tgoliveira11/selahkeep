import { describe, it, expect } from "vitest";
import {
  formatTagDisplay,
  MAX_TAG_LENGTH,
  normalizeTagInput,
  normalizeTagList,
} from "@/lib/notes/tag-normalization";

describe("normalizeTagInput", () => {
  it("removes accents", () => {
    expect(normalizeTagInput("fé")).toBe("fe");
    expect(normalizeTagInput("oração")).toBe("oracao");
  });

  it("removes spaces and camelCases the next word", () => {
    expect(normalizeTagInput("fé em Deus")).toBe("feEmDeus");
    expect(normalizeTagInput("vida espiritual")).toBe("vidaEspiritual");
  });

  it("lowercases the first letter", () => {
    expect(normalizeTagInput("Família")).toBe("familia");
  });

  it("removes hash characters", () => {
    expect(normalizeTagInput("#oração")).toBe("oracao");
  });

  it("rejects empty tags", () => {
    expect(normalizeTagInput("")).toBeNull();
    expect(normalizeTagInput("   ")).toBeNull();
    expect(normalizeTagInput("###")).toBeNull();
  });

  it("enforces max length", () => {
    const tooLong = "a".repeat(MAX_TAG_LENGTH + 1);
    expect(normalizeTagInput(tooLong)).toBeNull();
    expect(normalizeTagInput("a".repeat(MAX_TAG_LENGTH))).toBe("a".repeat(MAX_TAG_LENGTH));
  });
});

describe("normalizeTagList", () => {
  it("splits paste by comma", () => {
    expect(normalizeTagList("trabalho, família")).toEqual(["trabalho", "familia"]);
  });

  it("splits paste by semicolon", () => {
    expect(normalizeTagList("trabalho; fé")).toEqual(["trabalho", "fe"]);
  });

  it("splits paste by newline", () => {
    expect(normalizeTagList("faith\nfamily")).toEqual(["faith", "family"]);
  });

  it("deduplicates normalized tags", () => {
    expect(normalizeTagList("Faith, faith, FAITH")).toEqual(["faith"]);
  });
});

describe("formatTagDisplay", () => {
  it("displays tags with # but stores without #", () => {
    const stored = normalizeTagInput("faith");
    expect(stored).toBe("faith");
    expect(formatTagDisplay(stored!)).toBe("#faith");
    expect(stored).not.toContain("#");
  });
});
