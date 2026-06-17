import { safeLogger } from "@/lib/logger";

export type PasskeyLoginVaultAuditEvent =
  | "passkey_login_completed"
  | "passkey_login_vault_unlock_succeeded"
  | "passkey_login_vault_unlock_unavailable"
  | "passkey_login_vault_unlock_failed"
  | "passkey_login_vault_auto_unlock_succeeded"
  | "passkey_login_vault_auto_unlock_unavailable"
  | "passkey_vault_unlock_enabled"
  | "passkey_vault_unlock_disabled"
  | "passkey_vault_unlock_succeeded"
  | "passkey_vault_unlock_failed";

export function logPasskeyLoginVaultEvent(
  event: PasskeyLoginVaultAuditEvent,
  metadata?: { method?: string; errorCode?: string }
): void {
  safeLogger.info(event, metadata ?? {});
}
