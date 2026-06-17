import { describe, it, expect } from "vitest";
import { isVaultUnlocked, getSessionVaultKey, lockVault } from "@/lib/crypto-client/vault";

describe("vault session without unlock", () => {
  it("account session alone does not unlock vault", () => {
    lockVault();
    expect(getSessionVaultKey()).toBeNull();
    expect(isVaultUnlocked()).toBe(false);
  });
});
