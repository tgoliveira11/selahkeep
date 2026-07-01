import {
  buildVaultUnlockHref as coreBuildVaultUnlockHref,
  readVaultUnlockReturnPath,
  resolveVaultUnlockReturnPath,
  VAULT_UNLOCK_RETURN_QUERY_PARAM,
} from "@tgoliveira/vault-core/react";

const ALLOWED_VAULT_RETURN_PATTERNS = [
  /^\/home(?:\/|$)/,
  /^\/notes(?:\/|$)/,
  /^\/kanban(?:\/|$)/,
  /^\/vault\/settings(?:\/|$)/,
  /^\/vault\/security(?:\/|$)/,
  /^\/vault\/recovery(?:\/|$)/,
  /^\/settings\/account(?:\/|$)/,
] as const;

const UNLOCK_PATH = "/vault/unlock";

function isAllowedSelahkeepReturnPath(path: string): boolean {
  if (path === UNLOCK_PATH || path.startsWith(`${UNLOCK_PATH}/`)) return false;
  return ALLOWED_VAULT_RETURN_PATTERNS.some((pattern) => pattern.test(path));
}

/** Allows in-app return paths after vault unlock (notes, kanban, and protected vault routes). */
export function sanitizeVaultReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  const resolved = resolveVaultUnlockReturnPath(path, { defaultPath: "" });
  if (!resolved || resolved === "") return null;
  if (!isAllowedSelahkeepReturnPath(resolved)) return null;
  return resolved;
}

/** @deprecated Use {@link sanitizeVaultReturnTo}. */
export function safeNotesReturnTo(path: string | null | undefined): string | null {
  return sanitizeVaultReturnTo(path);
}

export function readSelahkeepVaultUnlockReturnPath(
  searchParams: { get: (name: string) => string | null },
  defaultPath = "/notes"
): string {
  const fromNext = readVaultUnlockReturnPath(searchParams, {
    defaultPath: "",
    paramName: VAULT_UNLOCK_RETURN_QUERY_PARAM,
  });
  const fromLegacy = searchParams.get("returnTo");
  const candidate = fromNext || fromLegacy;
  return sanitizeVaultReturnTo(candidate) ?? defaultPath;
}

export function buildVaultUnlockHref(returnTo?: string | null): string {
  const safe = sanitizeVaultReturnTo(returnTo);
  if (!safe) return UNLOCK_PATH;
  return coreBuildVaultUnlockHref(UNLOCK_PATH, safe);
}

export { VAULT_UNLOCK_RETURN_QUERY_PARAM };
