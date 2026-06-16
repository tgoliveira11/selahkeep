import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logPasskeyLoginVaultEvent,
  type PasskeyLoginVaultAuditEvent,
} from "@/features/passkey/passkey-login-audit";
import { safeLogger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  safeLogger: {
    info: vi.fn(),
  },
}));

describe("passkey login vault audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs safe metadata for vault unlock events", () => {
    const events: PasskeyLoginVaultAuditEvent[] = [
      "passkey_login_completed",
      "passkey_login_vault_unlock_succeeded",
      "passkey_login_vault_unlock_unavailable",
      "passkey_login_vault_unlock_failed",
    ];

    for (const event of events) {
      logPasskeyLoginVaultEvent(event, { method: "passkey", errorCode: "no_envelope" });
    }

    expect(safeLogger.info).toHaveBeenCalledTimes(4);
    expect(safeLogger.info).toHaveBeenCalledWith("passkey_login_completed", {
      method: "passkey",
      errorCode: "no_envelope",
    });
  });
});
