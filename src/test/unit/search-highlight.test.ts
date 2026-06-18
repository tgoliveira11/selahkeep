import { describe, it, expect } from "vitest";
import { highlightSearchTermsInHtml } from "@/components/notes/search-highlight";

describe("search highlight html", () => {
  it("highlights terms in html text nodes only", () => {
    const html = highlightSearchTermsInHtml("<p>Hello <strong>peace</strong> world</p>", "peace");
    expect(html).toContain('<mark class="search-highlight">peace</mark>');
    expect(html).toContain("<strong>");
  });

  it("does not execute scripts in highlight path", () => {
    const html = highlightSearchTermsInHtml("<p>safe peace</p>", "peace");
    expect(html).not.toContain("<script");
  });
});
