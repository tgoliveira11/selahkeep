import { sanitizeVaultReturnTo } from "@/lib/notes/safe-return-to";

const BLOCKED_AUTH_CALLBACK_PATTERNS = [
  /^\/login(?:\/|$)/,
  /^\/auth\/two-factor(?:\/|$)/,
] as const;

const ALLOWED_AUTH_CALLBACK_PATTERNS = [
  /^\/home(?:\/|$)/,
  /^\/notes(?:\/|$)/,
  /^\/vault\/settings(?:\/|$)/,
  /^\/vault\/security(?:\/|$)/,
  /^\/vault\/recovery(?:\/|$)/,
  /^\/settings\/account(?:\/|$)/,
  /^\/admin(?:\/|$)/,
] as const;

function sanitizeAuthCallbackPathname(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null;
  if (pathname.startsWith("//") || pathname.includes("\\")) return null;
  if (pathname.includes(":")) return null;
  if (pathname === "/vault/unlock" || pathname.startsWith("/vault/unlock/")) return null;
  if (!ALLOWED_AUTH_CALLBACK_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return null;
  }
  return pathname;
}

/** Sanitize post-login redirect targets; defaults to `/home` when invalid. */
export function sanitizeAuthCallbackUrl(
  path: string | null | undefined,
  defaultPath = "/home"
): string {
  if (!path) return defaultPath;
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : path.slice(queryIndex);
  const sanitizedPath = sanitizeAuthCallbackPathname(pathname) ?? sanitizeVaultReturnTo(pathname);
  if (!sanitizedPath) return defaultPath;
  if (BLOCKED_AUTH_CALLBACK_PATTERNS.some((pattern) => pattern.test(sanitizedPath))) {
    return defaultPath;
  }
  return `${sanitizedPath}${query}`;
}
