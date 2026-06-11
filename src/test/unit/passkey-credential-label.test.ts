import { describe, it, expect } from "vitest";
import {
  getPasskeyCapabilityDisplay,
  getPasskeyCapabilityLabel,
  isVaultRecoveryPasskey,
} from "@/lib/passkey/credential-label";

describe("passkey credential labels", () => {
  it("labels sign-in only passkeys", () => {
    expect(
      getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: false })
    ).toBe("sign-in-only");
    expect(getPasskeyCapabilityDisplay("sign-in-only")).toBe("Sign-in only");
  });

  it("labels sign-in and vault unlock passkeys", () => {
    expect(
      getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: true })
    ).toBe("sign-in-and-vault-unlock");
    expect(getPasskeyCapabilityDisplay("sign-in-and-vault-unlock")).toBe(
      "Sign-in + vault unlock"
    );
  });

  it("treats vault recovery availability from vault unlock flag", () => {
    expect(isVaultRecoveryPasskey({ signInEnabled: true, vaultUnlockEnabled: false })).toBe(
      false
    );
    expect(isVaultRecoveryPasskey({ signInEnabled: true, vaultUnlockEnabled: true })).toBe(true);
  });

  it("labels disabled sign-in as sign-in-only capability display path", () => {
    expect(
      getPasskeyCapabilityLabel({ signInEnabled: false, vaultUnlockEnabled: false })
    ).toBe("sign-in-only");
  });
});
