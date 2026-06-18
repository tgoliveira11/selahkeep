import { sanitizeVaultReturnTo } from "@/lib/notes/safe-return-to";

const BLOCKED_AUTH_CALLBACK_PATTERNS = [
  /^\/login(?:\/|$)/,
  /^\/auth\/two-factor(?:\/|$)/,
] as const;

/** Sanitize post-login redirect targets; defaults to `/notes` when invalid. */
export function sanitizeAuthCallbackUrl(
  path: string | null | undefined,
  defaultPath = "/notes"
): string {
  if (!path) return defaultPath;
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : path.slice(queryIndex);
  const sanitizedPath = sanitizeVaultReturnTo(pathname);
  if (!sanitizedPath) return defaultPath;
  if (BLOCKED_AUTH_CALLBACK_PATTERNS.some((pattern) => pattern.test(sanitizedPath))) {
    return defaultPath;
  }
  return `${sanitizedPath}${query}`;
}
