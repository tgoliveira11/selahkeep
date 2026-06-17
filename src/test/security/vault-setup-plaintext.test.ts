import { describe, it, expect } from "vitest";
import { rejectVaultPlaintextFields } from "@/lib/validation/vault";

describe("vault setup plaintext rejection", () => {
  it("rejects vault password in request body", () => {
    expect(rejectVaultPlaintextFields({ vaultPassword: "secret" })).toMatch(/vaultPassword/);
  });

  it("rejects recovery phrase in request body", () => {
    expect(rejectVaultPlaintextFields({ recoveryPhrase: "abandon ability" })).toMatch(
      /recoveryPhrase/
    );
  });

  it("rejects user vault key in request body", () => {
    expect(rejectVaultPlaintextFields({ userVaultKey: "raw-key" })).toMatch(/userVaultKey/);
  });

  it("allows encrypted field names", () => {
    expect(
      rejectVaultPlaintextFields({
        encryptedVaultSettings: { version: "enc-v1" },
        encryptedVaultIndex: { version: "enc-v1" },
        vaultVersion: "vault-v2",
      })
    ).toBeNull();
  });
});
