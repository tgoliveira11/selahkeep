import { rejectPlaintextFields } from "@/lib/validation/plaintext-forbidden";

const PASSKEY_VAULT_FORBIDDEN_FIELDS = [
  "prfOutput",
  "userVaultKey",
  "noteKey",
  "vaultPassword",
  "recoveryPhrase",
] as const;

export function rejectPasskeyVaultForbiddenFields(body: Record<string, unknown>): string | null {
  const plaintextError = rejectPlaintextFields(body);
  if (plaintextError) return plaintextError;

  for (const field of PASSKEY_VAULT_FORBIDDEN_FIELDS) {
    if (field in body && body[field] !== undefined) {
      return `Forbidden field '${field}' is not allowed`;
    }
  }
  return null;
}
