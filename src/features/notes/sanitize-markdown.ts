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

function hardenTaskInputs(node: Element): void {
  if (node.tagName !== "INPUT") return;
  const type = node.getAttribute("type");
  if (type !== "checkbox") {
    node.remove();
    return;
  }
  node.setAttribute("disabled", "");
}

export function sanitizeMarkdownHtml(html: string): string {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    hardenLinks(node as Element);
    hardenTaskInputs(node as Element);
  });

  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [...ALLOWED_TAGS],
      ALLOWED_ATTR: [...ALLOWED_ATTR],
      ALLOW_DATA_ATTR: false,
    });
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes");
  }
}

export function renderSanitizedMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return sanitizeMarkdownHtml(rawHtml);
}
