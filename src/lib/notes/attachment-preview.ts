import { getFileExtension } from "@/lib/notes/attachment-file-types";

export type AttachmentPreviewKind = "image" | "pdf" | "text" | "audio" | "video" | "none";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "log",
  "xml",
  "yaml",
  "yml",
]);

const TEXT_MIME_EXACT = new Set([
  "application/json",
  "application/xml",
  "text/xml",
]);

/** Classifies whether an attachment can be previewed in the browser (client-side only). */
export function attachmentPreviewKind(mimeType: string, filename: string): AttachmentPreviewKind {
  const mime = (mimeType || "").toLowerCase().split(";")[0]!.trim();
  const ext = getFileExtension(filename);

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("text/") || TEXT_MIME_EXACT.has(mime)) return "text";
  if (ext && TEXT_EXTENSIONS.has(ext)) return "text";

  return "none";
}

export function canPreviewAttachment(mimeType: string, filename: string): boolean {
  return attachmentPreviewKind(mimeType, filename) !== "none";
}

const DEFAULT_TEXT_PREVIEW_CHARS = 2_000;

/** Truncates decrypted text for inline preview without rendering huge blobs. */
export function truncateTextPreview(content: string, maxChars = DEFAULT_TEXT_PREVIEW_CHARS): string {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}\n\n…`;
}

export function decodeAttachmentText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
