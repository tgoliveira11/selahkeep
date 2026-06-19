import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logPasskeyVaultEvent,
  type PasskeyVaultAuditEvent,
} from "@/features/passkey/passkey-vault-audit";
import { safeLogger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  safeLogger: {
    info: vi.fn(),
  },
}));

describe("passkey vault audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs safe metadata for vault unlock events", () => {
    const events: PasskeyVaultAuditEvent[] = [
      "passkey_vault_unlock_enabled",
      "passkey_vault_unlock_disabled",
      "passkey_vault_unlock_succeeded",
      "passkey_vault_unlock_failed",
    ];

    for (const event of events) {
      logPasskeyVaultEvent(event, { method: "passkey", errorCode: "no_envelope" });
    }

    expect(safeLogger.info).toHaveBeenCalledTimes(4);
    expect(safeLogger.info).toHaveBeenCalledWith("passkey_vault_unlock_enabled", {
      method: "passkey",
      errorCode: "no_envelope",
    });
  });
});
