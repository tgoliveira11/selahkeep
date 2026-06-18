/** Allows in-app return paths after vault unlock (notes routes only). */
export function safeNotesReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/notes")) return null;
  if (path.includes("//") || path.includes("\\")) return null;
  return path;
}

export function buildVaultUnlockHref(returnTo?: string | null): string {
  const safe = safeNotesReturnTo(returnTo);
  if (!safe) return "/vault/unlock";
  return `/vault/unlock?returnTo=${encodeURIComponent(safe)}`;
}
