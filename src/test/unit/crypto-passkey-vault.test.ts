import { userVaultKeysEqual } from "@tgoliveira/vault-core";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractPasskeyPrfOutput,
  isPasskeySupported,
  wrapVaultKeyForPasskey,
  unwrapVaultKeyFromPasskey,
  unlockVaultFromPasskeyEnvelope,
} from "@/lib/crypto-client/passkey-vault";
import { generateUserVaultKey } from "@/lib/crypto-client/vault";
import { clearVaultInnerKeyMaterial } from "@/modules/vault/core/envelopes/vault-inner-key-material";
import { resetVaultSessionStoreForTests } from "@/lib/crypto-client/vault-session";
import { USER_ID } from "@/test/helpers/fixtures";

describe("passkey vault crypto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearVaultInnerKeyMaterial();
    resetVaultSessionStoreForTests();
  });

  it("detects passkey support when WebAuthn is available", () => {
    vi.stubGlobal("window", { PublicKeyCredential: class {} });
    expect(isPasskeySupported()).toBe(true);
    vi.unstubAllGlobals();
  });

  it("reports passkeys unsupported when WebAuthn is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(isPasskeySupported()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("extractPasskeyPrfOutput reads PRF extension output", () => {
    const bytes = new Uint8Array(32).fill(7);
    expect(
      extractPasskeyPrfOutput({
        prf: { results: { first: bytes.buffer } },
      } as never)
    ).toEqual(bytes);
    expect(extractPasskeyPrfOutput({} as never)).toBeNull();
    expect(
      extractPasskeyPrfOutput({
        prf: { results: { first: new Uint8Array(8).buffer } },
      } as never)
    ).toBeNull();
  });

  it("wraps and unwraps vault key with PRF output", async () => {
    const vaultKey = await generateUserVaultKey();
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await wrapVaultKeyForPasskey(vaultKey, prfOutput, USER_ID, USER_ID);
    const restored = await unwrapVaultKeyFromPasskey(envelope, prfOutput);
    expect(await userVaultKeysEqual(restored, vaultKey)).toBe(true);
  });

  it("unlockVaultFromPasskeyEnvelope unlocks with PRF output only", async () => {
    const vaultKey = await generateUserVaultKey();
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await wrapVaultKeyForPasskey(vaultKey, prfOutput, USER_ID, USER_ID);
    const restored = await unlockVaultFromPasskeyEnvelope(USER_ID, envelope, prfOutput);
    expect(restored).toBeTruthy();
  });

  it("rejects passkey unlock when PRF is required but unavailable", async () => {
    const vaultKey = await generateUserVaultKey();
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await wrapVaultKeyForPasskey(vaultKey, prfOutput, USER_ID, USER_ID);
    await expect(
      unlockVaultFromPasskeyEnvelope(USER_ID, envelope, null, { prfRequired: true })
    ).rejects.toMatchObject({ name: "PasskeyPrfRequiredError" });
  });
});
