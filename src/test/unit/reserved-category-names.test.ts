import { describe, it, expect } from "vitest";
import {
  isReservedCategoryName,
  normalizeCategoryName,
  RESERVED_CATEGORY_MESSAGE,
} from "@/lib/notes/reserved-category-names";

describe("reserved category names", () => {
  it("blocks template labels case-insensitively", () => {
    expect(isReservedCategoryName("Prayer")).toBe(true);
    expect(isReservedCategoryName("prayer")).toBe(true);
    expect(isReservedCategoryName("PRAYER")).toBe(true);
  });

  it("blocks trimmed and spaced variants", () => {
    expect(isReservedCategoryName("  Prayer  ")).toBe(true);
    expect(isReservedCategoryName("Sermon Notes")).toBe(true);
    expect(isReservedCategoryName("sermon  notes")).toBe(true);
  });

  it("blocks Blank note label", () => {
    expect(isReservedCategoryName("Blank note")).toBe(true);
  });

  it("allows custom category names", () => {
    expect(isReservedCategoryName("Personal")).toBe(false);
    expect(isReservedCategoryName("Family")).toBe(false);
  });

  it("exposes validation message", () => {
    expect(RESERVED_CATEGORY_MESSAGE).toMatch(/reserved for templates/i);
  });

  it("normalizes accents for comparison", () => {
    expect(normalizeCategoryName("José")).toBe("jose");
  });
});
