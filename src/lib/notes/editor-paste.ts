import DOMPurify from "isomorphic-dompurify";

const PASTE_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "h1",
  "h2",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
] as const;

const PASTE_ALLOWED_ATTR = ["href", "title"] as const;

/**
 * Strips unsafe HTML from pasted rich text while keeping supported formatting.
 * Plain-text paste is unchanged by the caller.
 */
export function sanitizeEditorPasteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...PASTE_ALLOWED_TAGS],
    ALLOWED_ATTR: [...PASTE_ALLOWED_ATTR],
  });
}
