import { marked } from "marked";
import { sanitizeMarkdownHtmlString } from "@/lib/notes/html-sanitize-config";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function annotateInteractiveChecklists(html: string): string {
  let index = 0;
  return html.replace(/<input\b[^>]*\btype="checkbox"[^>]*>/gi, (match) => {
    const checked = /\bchecked\b/i.test(match);
    const idx = index++;
    return `<input type="checkbox" data-checklist-index="${idx}"${checked ? " checked" : ""} aria-label="Toggle checklist item">`;
  });
}

export type RenderMarkdownOptions = {
  interactiveChecklists?: boolean;
};

export function sanitizeMarkdownHtml(
  html: string,
  options: RenderMarkdownOptions = {}
): string {
  const interactiveChecklists = options.interactiveChecklists ?? false;
  const sanitized = sanitizeMarkdownHtmlString(html, { interactiveChecklists });
  return interactiveChecklists ? annotateInteractiveChecklists(sanitized) : sanitized;
}

export function renderSanitizedMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {}
): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return sanitizeMarkdownHtml(rawHtml, options);
}
