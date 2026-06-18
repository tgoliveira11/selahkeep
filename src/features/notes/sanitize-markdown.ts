import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
  "input",
] as const;

const ALLOWED_ATTR = ["href", "title", "rel", "target", "type", "checked", "disabled"] as const;

function hardenLinks(node: Element): void {
  if (node.tagName !== "A") return;

  const href = node.getAttribute("href");
  if (!href || href.trim().toLowerCase().startsWith("javascript:")) {
    node.removeAttribute("href");
    return;
  }

  if (/^https?:\/\//i.test(href)) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
}

function hardenTaskInputs(node: Element, interactiveChecklists: boolean): void {
  if (node.tagName !== "INPUT") return;
  const type = node.getAttribute("type");
  if (type !== "checkbox") {
    node.remove();
    return;
  }
  if (interactiveChecklists) {
    node.removeAttribute("disabled");
    return;
  }
  node.setAttribute("disabled", "");
}

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
  const allowedAttr = interactiveChecklists
    ? ([...ALLOWED_ATTR, "data-checklist-index", "aria-label"] as const)
    : ALLOWED_ATTR;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    hardenLinks(node as Element);
    hardenTaskInputs(node as Element, interactiveChecklists);
  });

  try {
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [...ALLOWED_TAGS],
      ALLOWED_ATTR: [...allowedAttr],
      ALLOW_DATA_ATTR: interactiveChecklists,
    });
    return interactiveChecklists ? annotateInteractiveChecklists(sanitized) : sanitized;
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}

export function renderSanitizedMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {}
): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return sanitizeMarkdownHtml(rawHtml, options);
}
