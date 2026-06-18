import { describe, it, expect } from "vitest";
import { renderSanitizedMarkdown, sanitizeMarkdownHtml } from "@/features/notes/sanitize-markdown";

describe("sanitize markdown", () => {
  it("renders bold from **bold**", () => {
    const html = renderSanitizedMarkdown("This is **bold**");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("renders italic from *italic*", () => {
    const html = renderSanitizedMarkdown("This is *italic*");
    expect(html).toContain("<em>italic</em>");
  });

  it("renders unordered list from - item", () => {
    const html = renderSanitizedMarkdown("- item 1\n- item 2");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item 1</li>");
    expect(html).toContain("<li>item 2</li>");
  });

  it("renders ordered list from 1. item", () => {
    const html = renderSanitizedMarkdown("1. first\n2. second");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>first</li>");
  });

  it("renders heading from # Heading", () => {
    const html = renderSanitizedMarkdown("# Heading");
    expect(html).toContain("<h1");
    expect(html).toContain("Heading");
  });

  it("renders blockquote from > quote", () => {
    const html = renderSanitizedMarkdown("> quote");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("quote");
  });

  it("renders safe links with rel and target", () => {
    const html = renderSanitizedMarkdown("[OpenAI](https://openai.com)");
    expect(html).toContain('href="https://openai.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("does not render unsafe script tags", () => {
    const html = renderSanitizedMarkdown('<script>alert("xss")</script>\n\n**safe**');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
    expect(html).toContain("<strong>safe</strong>");
  });

  it("blocks javascript: links", () => {
    const html = renderSanitizedMarkdown("[bad](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("safely handles malformed markdown such as ****text", () => {
    const html = renderSanitizedMarkdown("****mas é isso, bola para frente.");
    expect(html).not.toContain("<script");
    expect(html).toContain("mas é isso");
  });

  it("strips raw script tags from HTML input", () => {
    const sanitized = sanitizeMarkdownHtml('<img src=x onerror="alert(1)"><p>ok</p>');
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).toContain("ok");
  });

  it("renders checklist items", () => {
    const html = renderSanitizedMarkdown("- [ ] Pray\n- [x] Done");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain("disabled");
  });

  it("renders Portuguese example with list and bold", () => {
    const markdown = `faz algum tempo, tive esse sonho super estranho

- item 1
- item 2
- item 3

Isso é **bold** e isso é *italic*.`;

    const html = renderSanitizedMarkdown(markdown);
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item 1</li>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });
});
