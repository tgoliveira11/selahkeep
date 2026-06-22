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
