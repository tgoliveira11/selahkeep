/** Authenticated routes that do not require an unlocked vault (no lock overlay). */
export const VAULT_UNPROTECTED_PATHS = ["/home"] as const;

export function isVaultUnprotectedPath(pathname: string): boolean {
  return VAULT_UNPROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
