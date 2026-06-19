import { safeLogger } from "@/lib/logger";

export type PasskeyVaultAuditEvent =
  | "passkey_vault_unlock_enabled"
  | "passkey_vault_unlock_disabled"
  | "passkey_vault_unlock_succeeded"
  | "passkey_vault_unlock_failed";

export function logPasskeyVaultEvent(
  event: PasskeyVaultAuditEvent,
  metadata?: { method?: string; errorCode?: string }
): void {
  safeLogger.info(event, metadata ?? {});
}
