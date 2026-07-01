import { describe, it, expect, vi } from "vitest";
import { touchVaultActivity, useVaultActivity } from "@/features/vault/use-vault-activity";
import * as vaultSession from "@/lib/crypto-client/vault-session";

describe("useVaultActivity", () => {
  it("is a deprecated no-op hook", () => {
    expect(useVaultActivity()).toBeUndefined();
  });

  it("touchVaultActivity still renews the vault session", () => {
    const touch = vi.spyOn(vaultSession, "touchVaultSession").mockImplementation(() => {});
    touchVaultActivity();
    expect(touch).toHaveBeenCalledTimes(1);
    touch.mockRestore();
  });
});
