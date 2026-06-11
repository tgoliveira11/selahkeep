/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPasskeyLoginOptionsPayload,
  signInWithPasskey,
  PASSKEY_LOGIN_OUTCOME_KEY,
} from "@/features/passkey/sign-in-with-passkey";
import { USER_ID } from "@/test/helpers/fixtures";
import { encryptedPayload } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  options: vi.fn(),
  verify: vi.fn(),
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

describe("buildPasskeyLoginOptionsPayload", () => {
  it("prefers email over saved hint", () => {
    expect(
      buildPasskeyLoginOptionsPayload("user@example.com", {
        userId: USER_ID,
        credentialId: "cred-id",
      })
    ).toEqual({ email: "user@example.com" });
  });

  it("uses credentialId without userId when only credential is saved", () => {
    expect(buildPasskeyLoginOptionsPayload(undefined, { credentialId: "cred-id" })).toEqual({
      credentialId: "cred-id",
    });
  });

  it("uses saved userId when credentialId is missing", () => {
    expect(buildPasskeyLoginOptionsPayload(undefined, { userId: USER_ID })).toEqual({
      userId: USER_ID,
    });
  });

  it("returns undefined when no email or hint exists", () => {
    expect(buildPasskeyLoginOptionsPayload(undefined, null)).toBeUndefined();
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

  it("unlocks vault and routes to letters when PRF envelope succeeds", async () => {
    const result = await signInWithPasskey();
    expect(mocks.options).toHaveBeenCalledWith({
      credentialId: "cred-id",
      userId: USER_ID,
    });
    expect(mocks.vaultUnlockOptions).not.toHaveBeenCalled();
    expect(mocks.unlockVaultFromPasskeyEnvelope).toHaveBeenCalled();
    expect(mocks.setPasskeyLoginHint).toHaveBeenCalledWith({
      userId: USER_ID,
      credentialId: "cred-id",
    });
    expect(mocks.setPasskeyLoginHint).toHaveBeenCalledTimes(1);
    expect(result.outcome).toBe("vault-unlocked");
    expect(result.redirectTo).toBe("/letters");
    expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBe("vault-unlocked");
  });

  it("routes to vault unlock when signed in without vault unlock", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue(null);
    mocks.options.mockResolvedValue({ options: { challenge: "c" }, prfIncluded: false });
    mocks.extractPasskeyPrfOutput.mockReturnValue(null);
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(mocks.vaultUnlockOptions).toHaveBeenCalled();
    expect(result.outcome).toBe("vault-locked");
    expect(result.redirectTo).toBe("/vault/unlock");
  });

  it("unlocks vault after discoverable login via follow-up PRF ceremony", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue(null);
    mocks.options.mockResolvedValue({ options: { challenge: "c" }, prfIncluded: false });
    mocks.extractPasskeyPrfOutput
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(new Uint8Array(32));
    mocks.startAuthentication
      .mockResolvedValueOnce({ id: "cred", clientExtensionResults: {} })
      .mockResolvedValueOnce({ id: "cred", clientExtensionResults: {} });

    const result = await signInWithPasskey();

    expect(mocks.vaultUnlockOptions).toHaveBeenCalledWith({
      loginToken: "token",
      credentialId: "cred-id",
    });
    expect(mocks.unlockVaultFromPasskeyEnvelope).toHaveBeenCalled();
    expect(result.outcome).toBe("vault-unlocked");
  });

  it("handles user cancellation during WebAuthn", async () => {
    mocks.startAuthentication.mockRejectedValue(Object.assign(new Error("cancelled"), { name: "NotAllowedError" }));
    const result = await signInWithPasskey();
    expect(result.outcome).toBe("cancelled");
  });

  it("handles user cancellation during follow-up PRF unlock", async () => {
    mocks.options.mockResolvedValue({ options: { challenge: "c" }, prfIncluded: false });
    mocks.extractPasskeyPrfOutput.mockReturnValueOnce(null);
    mocks.startAuthentication
      .mockResolvedValueOnce({ id: "cred", clientExtensionResults: {} })
      .mockRejectedValueOnce(Object.assign(new Error("cancelled"), { name: "NotAllowedError" }));

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("cancelled");
  });

  it("routes to vault unlock when no vault envelope exists", async () => {
    mocks.verify.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
      vaultUnlockAvailable: false,
      encryptedVaultKey: null,
      prfRequired: true,
    });
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("vault-locked");
    expect(result.redirectTo).toBe("/vault/unlock");
  });

  it("throws when session sign-in fails after passkey verify", async () => {
    mocks.signIn.mockResolvedValue({ error: "CredentialsSignin" });
    await expect(signInWithPasskey()).rejects.toThrow("Passkey sign-in could not complete your session.");
  });

  it("stores vault-locked when unlock throws generic error", async () => {
    mocks.unlockVaultFromPasskeyEnvelope.mockRejectedValue(new Error("decrypt failed"));
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("vault-locked");
    expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBe("vault-locked");
  });

  it("stores prf-unavailable when unlock throws PasskeyPrfRequiredError", async () => {
    const { PasskeyPrfRequiredError } = await import("@/lib/crypto-client/passkey-vault");
    mocks.unlockVaultFromPasskeyEnvelope.mockRejectedValue(
      new PasskeyPrfRequiredError("PRF required")
    );
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("prf-unavailable");
    expect(sessionStorage.getItem(PASSKEY_LOGIN_OUTCOME_KEY)).toBe("prf-unavailable");
  });

  it("stores prf-unavailable when first login options included PRF but output missing", async () => {
    mocks.options.mockResolvedValue({ options: { challenge: "c" }, prfIncluded: true });
    mocks.extractPasskeyPrfOutput.mockReturnValue(null);
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(mocks.vaultUnlockOptions).not.toHaveBeenCalled();
    expect(result.outcome).toBe("prf-unavailable");
  });

  it("passes email to options when provided", async () => {
    mocks.getPasskeyLoginHint.mockReturnValue({ userId: USER_ID, credentialId: "cred-id" });
    await signInWithPasskey({ email: "user@example.com" });
    expect(mocks.options).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("stores vault-locked outcome when PRF included but output missing", async () => {
    mocks.options.mockResolvedValue({ options: { challenge: "c" }, prfIncluded: false });
    mocks.extractPasskeyPrfOutput.mockReturnValue(null);
    mocks.verify.mockResolvedValue({
      loginToken: "token",
      userId: USER_ID,
      credentialId: "cred-id",
      vaultUnlockAvailable: true,
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      prfRequired: true,
    });
    mocks.vaultUnlockOptions.mockResolvedValue({
      options: { challenge: "vault" },
      encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      prfRequired: true,
    });
    mocks.isVaultUnlocked.mockReturnValue(false);

    const result = await signInWithPasskey();
    expect(result.outcome).toBe("vault-locked");
  });
});
