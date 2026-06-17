import { describe, it, expect } from "vitest";
import { rejectPasskeyVaultForbiddenFields } from "@/server/policies/passkey-vault-plaintext-rejection";

describe("passkey vault plaintext rejection", () => {
  it("rejects PRF output in API payloads", () => {
    expect(rejectPasskeyVaultForbiddenFields({ prfOutput: new Uint8Array(32) })).toContain(
      "prfOutput"
    );
  });

  it("rejects User Vault Key in API payloads", () => {
    expect(rejectPasskeyVaultForbiddenFields({ userVaultKey: "secret" })).toContain("userVaultKey");
  });

  it("rejects note keys and vault secrets", () => {
    expect(rejectPasskeyVaultForbiddenFields({ noteKey: "x" })).toContain("noteKey");
    expect(rejectPasskeyVaultForbiddenFields({ vaultPassword: "x" })).toContain("vaultPassword");
    expect(rejectPasskeyVaultForbiddenFields({ recoveryPhrase: "x" })).toContain("recoveryPhrase");
  });

  it("rejects generic plaintext note fields", () => {
    expect(rejectPasskeyVaultForbiddenFields({ title: "secret" })).toContain("title");
  });
});
