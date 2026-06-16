import { safeLogger } from "@/lib/logger";

export type PasskeyLoginVaultAuditEvent =
  | "passkey_login_completed"
  | "passkey_login_vault_unlock_succeeded"
  | "passkey_login_vault_unlock_unavailable"
  | "passkey_login_vault_unlock_failed";

export function logPasskeyLoginVaultEvent(
  event: PasskeyLoginVaultAuditEvent,
  metadata?: { method?: string; errorCode?: string }
): void {
  safeLogger.info(event, metadata ?? {});
}
