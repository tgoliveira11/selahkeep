import { describe, it, expect } from "vitest";
import {
  findUnsupportedMarkdownFeatures,
  getMarkdownConversionWarning,
  hasMarkdownRoundtripLoss,
  normalizeMarkdownForCompare,
} from "@/lib/notes/markdown-roundtrip";

describe("markdown roundtrip helpers", () => {
  it("detects unsupported markdown features", () => {
    expect(findUnsupportedMarkdownFeatures("### H3")).toContain("headings below H2");
    expect(findUnsupportedMarkdownFeatures("![alt](https://x.com/a.png)")).toContain("images");
    expect(findUnsupportedMarkdownFeatures("| a | b |")).toContain("tables");
    expect(findUnsupportedMarkdownFeatures("```js\ncode\n```")).toContain("fenced code blocks");
  });

  it("returns null warning for supported markdown", () => {
    expect(getMarkdownConversionWarning("## Hello\n\n- [ ] task")).toBeNull();
  });

  it("returns warning text for unsupported markdown", () => {
    const warning = getMarkdownConversionWarning("### heading");
    expect(warning).toMatch(/Visual mode/i);
    expect(warning).toMatch(/headings below H2/i);
  });

  it("normalizes markdown for comparison", () => {
    expect(normalizeMarkdownForCompare("line  \n\n")).toBe("line");
    expect(hasMarkdownRoundtripLoss("a\n", "a")).toBe(false);
    expect(hasMarkdownRoundtripLoss("**bold**", "*bold*")).toBe(true);
  });
});
