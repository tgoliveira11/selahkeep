import { sanitizePasteHtmlString } from "@/lib/notes/html-sanitize-config";

/**
 * Strips unsafe HTML from pasted rich text while keeping supported formatting.
 * Plain-text paste is unchanged by the caller.
 */
export function sanitizeEditorPasteHtml(html: string): string {
  return sanitizePasteHtmlString(html);
}
