/**
 * Tidy a raw Whisper transcript for insertion into a note.
 * Pure string processing — never logs or transmits content.
 */
export function formatTranscript(raw: string): string {
  const collapsed = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (collapsed.length === 0) return "";
  return collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
}

/**
 * Append a transcript to existing note body text, inserting a blank line
 * between non-empty existing content and the new text.
 */
export function appendTranscript(existing: string, transcript: string): string {
  const clean = formatTranscript(transcript);
  if (!clean) return existing;
  if (!existing.trim()) return clean;
  const separator = existing.endsWith("\n") ? "" : "\n\n";
  return `${existing}${separator}${clean}`;
}
