import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_MARK_SVG } from "@/lib/ui/brand-mark";

describe("app brand icon", () => {
  it("uses LTG Vault purple monogram in favicon SVG", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    expect(icon).toContain("#5b3a8c");
    expect(icon).toContain("LTG");
    expect(icon).toContain('aria-label="LTG Vault"');
    expect(icon).not.toContain("#4a6741");
    expect(icon).not.toContain("M6 11.75");
  });

  it("keeps shared brand mark aligned with favicon file", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    const normalize = (value: string) => value.replace(/\s+/g, " ").replace(/ \/>/g, "/>").trim();
    expect(normalize(BRAND_MARK_SVG)).toBe(normalize(icon));
  });
});
