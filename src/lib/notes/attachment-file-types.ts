/** Client-side allowlist — blocks executables and risky types before encrypt/upload. */

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "ps1",
  "vbs",
  "js",
  "jse",
  "wsf",
  "sh",
  "bash",
  "apk",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "app",
  "dll",
  "so",
  "dylib",
  "jar",
  "html",
  "htm",
  "svg",
]);

const ALLOWED_MIME_PREFIXES = ["image/", "text/", "audio/", "video/"];

const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

export function getFileExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isAllowedAttachmentFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) return false;

  const mime = file.type.toLowerCase();
  if (!mime) {
    // Unknown MIME — allow only common safe extensions.
    const safeExt = new Set(["pdf", "txt", "md", "png", "jpg", "jpeg", "gif", "webp", "csv"]);
    return ext ? safeExt.has(ext) : false;
  }

  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export function attachmentRejectionReason(file: File): string | null {
  if (isAllowedAttachmentFile(file)) return null;
  const ext = getFileExtension(file.name);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return `"${ext}" files are not allowed for security reasons.`;
  }
  return "This file type is not supported. Try images, PDF, text, or common document formats.";
}
