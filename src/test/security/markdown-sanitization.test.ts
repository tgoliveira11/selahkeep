import { describe, it, expect } from "vitest";
import { renderSanitizedMarkdown, sanitizeMarkdownHtml } from "@/features/notes/sanitize-markdown";

describe("markdown sanitization", () => {
  it("strips script tags from rendered markdown", () => {
    const html = renderSanitizedMarkdown('Hello <script>alert("xss")</script>');
    expect(html).not.toContain("<script");
    expect(html).toContain("Hello");
  });

  it("allows safe markdown formatting", () => {
    const html = renderSanitizedMarkdown("**bold** and _italic_");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
  });

  it("sanitizes raw html directly", () => {
    const clean = sanitizeMarkdownHtml('<img src=x onerror=alert(1)><p>ok</p>');
    expect(clean).not.toContain("onerror");
    expect(clean).toContain("ok");
  });
});
