import { stripMarkdownForSnippet } from "@/lib/notes/note-text-search";

const DEFAULT_MIN = 120;
const DEFAULT_MAX = 180;

/** Client-side plaintext excerpt for note list previews (never persisted). */
export function extractNoteExcerpt(
  body: string,
  minLength = DEFAULT_MIN,
  maxLength = DEFAULT_MAX
): string | null {
  const plain = stripMarkdownForSnippet(body);
  if (!plain) return null;
  if (plain.length <= maxLength) return plain;

  let end = maxLength;
  while (end > minLength && plain[end] !== " " && plain[end - 1] !== " ") {
    end -= 1;
  }
  if (end <= minLength) end = maxLength;

  return `${plain.slice(0, end).trim()}…`;
}

const PREVIEW_MAX = 700;

/**
 * Richer body preview for the note-card hover popover. Unlike the inline
 * excerpt, this keeps the raw markdown (and its line breaks) so the popover can
 * render formatting; it is only truncated at a line/word boundary when long.
 * Client-side only, never persisted.
 */
export function buildNotePreview(body: string, maxLength = PREVIEW_MAX): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;

  let end = maxLength;
  while (end > 0 && trimmed[end] !== "\n" && trimmed[end] !== " ") {
    end -= 1;
  }
  if (end < maxLength * 0.6) end = maxLength;

  return `${trimmed.slice(0, end).trimEnd()}…`;
}
