import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_MARK_SVG } from "@/lib/ui/brand-mark";

describe("app brand icon", () => {
  it("uses LTG Vault purple design-system colors in favicon SVG", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    expect(icon).toContain("#5b3a8c");
    expect(icon).toContain("#faf8fc");
    expect(icon).toContain("#8b6bb8");
    expect(icon).toContain('aria-label="LTG Vault"');
  });

  it("keeps shared brand mark aligned with favicon file", () => {
    const icon = readFileSync(join(process.cwd(), "src/app/icon.svg"), "utf8");
    const normalize = (value: string) => value.replace(/\s+/g, " ").replace(/ \/>/g, "/>").trim();
    expect(normalize(BRAND_MARK_SVG)).toBe(normalize(icon));
  });
});
