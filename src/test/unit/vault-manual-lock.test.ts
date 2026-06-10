import { describe, it, expect, vi, beforeEach } from "vitest";
import { lockVaultSession, isVaultManuallyLocked } from "@/lib/crypto-client/vault-session";
import { unlockVaultFromDeviceEnvelopes } from "@/lib/crypto-client/vault-unlock";
import { USER_ID } from "@/test/helpers/fixtures";

describe("manual vault lock", () => {
  beforeEach(() => {
    lockVaultSession();
  });

  it("blocks silent unlock from device envelopes when manually locked", async () => {
    expect(isVaultManuallyLocked()).toBe(true);
    await expect(unlockVaultFromDeviceEnvelopes(USER_ID)).rejects.toThrow("Vault is locked");
  });
});
