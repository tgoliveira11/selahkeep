/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPasskeyLoginOptionsPayload,
  signInWithPasskey,
  PASSKEY_LOGIN_OUTCOME_KEY,
} from "@/features/passkey/passkey-login-with-vault-unlock";
import { USER_ID } from "@/test/helpers/fixtures";
import { encryptedPayload } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  options: vi.fn(),
  verify: vi.fn(),
  vaultUnlockMetadata: vi.fn(),
  vaultUnlockOptions: vi.fn(),
  signIn: vi.fn(),
  isPasskeySupported: vi.fn(),
  extractPasskeyPrfOutput: vi.fn(),
  unlockVaultFromPasskeyEnvelope: vi.fn(),
  isVaultUnlocked: vi.fn(),
  startAuthentication: vi.fn(),
  getPasskeyLoginHint: vi.fn(),
  setPasskeyLoginHint: vi.fn(),
}));

vi.mock("@/lib/api-client/passkey-login", () => ({
  passkeyLoginApi: {
    options: mocks.options,
    verify: mocks.verify,
    vaultUnlockMetadata: mocks.vaultUnlockMetadata,
    vaultUnlockOptions: mocks.vaultUnlockOptions,
  },
}));

vi.mock("next-auth/react", () => ({
  signIn: mocks.signIn,
}));

vi.mock("@simplewebauthn/browser", () => ({
  startAuthentication: mocks.startAuthentication,
}));

vi.mock("@/lib/crypto-client/passkey-vault", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/passkey-vault")>();
  return {
    ...actual,
    isPasskeySupported: mocks.isPasskeySupported,
    extractPasskeyPrfOutput: mocks.extractPasskeyPrfOutput,
    unlockVaultFromPasskeyEnvelope: mocks.unlockVaultFromPasskeyEnvelope,
  };
});

vi.mock("@/lib/crypto-client/vault", () => ({
  isVaultUnlocked: mocks.isVaultUnlocked,
}));

vi.mock("@/lib/passkey/prepare-webauthn-options", () => ({
  prepareAuthenticationOptions: (options: unknown) => options,
}));

vi.mock("@/lib/passkey/login-hint", () => ({
  getPasskeyLoginHint: mocks.getPasskeyLoginHint,
  setPasskeyLoginHint: mocks.setPasskeyLoginHint,
}));

vi.mock("@/features/passkey/passkey-login-audit", () => ({
  logPasskeyLoginVaultEvent: vi.fn(),
}));

describe("buildPasskeyLoginOptionsPayload", () => {
  it("prefers email over saved hint", () => {
    expect(
      buildPasskeyLoginOptionsPayload("user@example.com", {
        userId: USER_ID,
        credentialId: "cred-id",
      })
    ).toEqual({ email: "user@example.com" });
  });
});

describe("signInWithPasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.isPasskeySupported.mockReturnValue(true);
    mocks.getPasskeyLoginHint.mockReturnValue({ userId: USER_ID, credentialId: "cred-id" });
    mocks.options.mockResolvedValue({ options: { challenge: "c" }, prfIncluded: true });
    mocks.startAuthentication.mockResolvedValue({
      id: "cred",
      clientExtensionResults: {},
    });
    mocks.extractPasskeyPrfOutput.mockReturnValue(new Uint8Array(32));
    mocks.verify.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
    });
    mocks.vaultUnlockMetadata.mockResolvedValue({
      vaultUnlockAvailable: true,
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      prfRequired: true,
    });
    mocks.vaultUnlockOptions.mockResolvedValue({
      options: { challenge: "vault" },
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      prfRequired: true,
    });
    mocks.signIn.mockResolvedValue({ error: null });
    mocks.unlockVaultFromPasskeyEnvelope.mockResolvedValue({});
    mocks.isVaultUnlocked.mockReturnValue(true);
  });

  it("returns unsupported when passkeys are unavailable", async () => {
    mocks.isPasskeySupported.mockReturnValue(false);
    const result = await signInWithPasskey();
    expect(result.outcome).toBe("unsupported");
  });

  it("unlocks vault and routes to notes when PRF envelope succeeds (case A)", async () => {
    const result = await signInWithPasskey();
    expect(mocks.vaultUnlockMetadata).toHaveBeenCalledWith({
      loginToken: "token",
      credentialId: "cred-id",
    });
    expect(mocks.unlockVaultFromPasskeyEnvelope).toHaveBeenCalled();
    expect(result.outcome).toBe("vault-unlocked");
    expect(result.redirectTo).toBe("/notes");
    expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBe("vault-unlocked");
  });

  it("routes to vault unlock when signed in without vault envelope (case B)", async () => {
    mocks.vaultUnlockMetadata.mockResolvedValue({
      vaultUnlockAvailable: false,
      encryptedVaultKey: null,
      prfRequired: true,
    });
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("vault-locked");
    expect(result.redirectTo).toBe("/vault/unlock");
  });

  it("routes to 2FA when verify requires step-up", async () => {
    mocks.verify.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
      requiresTwoFactor: true,
    });
    const result = await signInWithPasskey();
    expect(result.outcome).toBe("requires-two-factor");
    expect(mocks.vaultUnlockMetadata).not.toHaveBeenCalled();
  });

  it("stores prf-unavailable when PRF included but output missing (case C)", async () => {
    mocks.extractPasskeyPrfOutput.mockReturnValue(null);
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("prf-unavailable");
    expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBe("prf-unavailable");
  });

  it("throws when session sign-in fails after passkey verify", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });
    await expect(signInWithPasskey()).rejects.toThrow("Passkey sign-in could not complete your session.");
  });
});
