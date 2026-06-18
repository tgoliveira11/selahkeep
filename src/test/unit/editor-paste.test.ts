import { describe, it, expect } from "vitest";
import { sanitizeEditorPasteHtml } from "@/lib/notes/editor-paste";

describe("editor paste sanitization", () => {
  it("keeps supported formatting tags", () => {
    const html = sanitizeEditorPasteHtml("<p><strong>bold</strong> <em>italic</em></p>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("strips scripts and unsafe tags", () => {
    const html = sanitizeEditorPasteHtml('<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("ok");
  });

  it("keeps safe links", () => {
    const html = sanitizeEditorPasteHtml('<a href="https://example.com">link</a>');
    expect(html).toContain('href="https://example.com"');
  });
});
