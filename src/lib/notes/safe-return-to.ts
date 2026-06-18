const ALLOWED_VAULT_RETURN_PATTERNS = [
  /^\/notes(?:\/|$)/,
  /^\/vault\/settings(?:\/|$)/,
  /^\/vault\/recovery(?:\/|$)/,
  /^\/settings\/account(?:\/|$)/,
] as const;

/** Allows in-app return paths after vault unlock (notes and protected vault routes). */
export function sanitizeVaultReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//") || path.includes("\\")) return null;
  if (path.includes(":")) return null;
  if (path === "/vault/unlock" || path.startsWith("/vault/unlock/")) return null;
  if (!ALLOWED_VAULT_RETURN_PATTERNS.some((pattern) => pattern.test(path))) {
    return null;
  }
  return path;
}

/** @deprecated Use {@link sanitizeVaultReturnTo}. */
export function safeNotesReturnTo(path: string | null | undefined): string | null {
  return sanitizeVaultReturnTo(path);
}

export function buildVaultUnlockHref(returnTo?: string | null): string {
  const safe = sanitizeVaultReturnTo(returnTo);
  if (!safe) return "/vault/unlock";
  return `/vault/unlock?returnTo=${encodeURIComponent(safe)}`;
}
