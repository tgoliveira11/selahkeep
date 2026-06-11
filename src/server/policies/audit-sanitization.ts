export const AUDIT_EVENT_TYPES = [
  "login_success",
  "login_failure",
  "vault_initialized",
  "recovery_code_generated",
  "recovery_code_regenerated",
  "trusted_device_added",
  "trusted_device_revoked",
  "trusted_device_removed",
  "trusted_device_renamed",
  "failed_unlock_attempt",
  "passkey_added",
  "passkey_removed",
  "account_deletion_requested",
  "letter_deleted",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

const ALLOWED_METADATA_KEYS = new Set([
  "deviceId",
  "method",
  "endpoint",
  "statusCode",
  "errorCode",
  "provider",
]);

const SENSITIVE_METADATA_PATTERNS = [
  /title/i,
  /body/i,
  /content/i,
  /recovery/i,
  /vaultkey/i,
  /letterkey/i,
  /ciphertext/i,
  /plaintext/i,
  /sentinel/i,
  /password/i,
];

export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!metadata) return null;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (typeof value === "string" && containsSensitiveText(value)) continue;
    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function containsSensitiveText(value: string): boolean {
  if (value.includes("SENTINEL-PRIVATE-LETTER")) return true;
  return SENSITIVE_METADATA_PATTERNS.some((pattern) => pattern.test(value));
}
