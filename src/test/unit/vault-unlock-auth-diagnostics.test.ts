import { describe, it, expect, vi } from "vitest";
import {
  buildVaultUnlockAuthDiagnostic,
  logVaultUnlockAuthDiagnostic,
} from "@/lib/passkey/vault-unlock-auth-diagnostics";

describe("vault unlock auth diagnostics", () => {
  it("builds safe diagnostic summary without credential IDs", () => {
    const diagnostic = buildVaultUnlockAuthDiagnostic({
      challenge: "abc",
      userVerification: "required",
      allowCredentials: [{ id: "secret-id", type: "public-key", transports: ["internal"] }],
      extensions: { prf: { eval: { first: "salt" } } },
    });

    expect(diagnostic).toEqual({
      purpose: "vault_unlock",
      allowCredentialsCount: 1,
      scopedCredentialIdPrefix: "secret-i",
      transportHints: ["internal"],
      prfMode: "eval",
      authenticatorAttachmentAtRegistration: "platform",
      userVerification: "required",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("secret-id");
  });

  it("infers cross-platform attachment from hybrid transport", () => {
    const diagnostic = buildVaultUnlockAuthDiagnostic({
      challenge: "abc",
      allowCredentials: [{ id: "x", type: "public-key", transports: ["hybrid"] }],
      extensions: { prf: { eval: { first: "salt" } } },
    });
    expect(diagnostic.authenticatorAttachmentAtRegistration).toBe("cross-platform");
    expect(diagnostic.transportHints).toEqual(["hybrid"]);
  });

  it("detects evalByCredential PRF mode", () => {
    const diagnostic = buildVaultUnlockAuthDiagnostic({
      challenge: "abc",
      allowCredentials: [],
      extensions: { prf: { evalByCredential: { "cred-a": { first: "salt" } } } },
    });
    expect(diagnostic.prfMode).toBe("evalByCredential");
  });

  it("does not log outside development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logVaultUnlockAuthDiagnostic({ challenge: "abc", allowCredentials: [] });

    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
