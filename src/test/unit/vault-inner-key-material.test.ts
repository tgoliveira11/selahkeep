import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  exportUserVaultKey,
  importUserVaultKey,
  unwrapVaultKeyFromPasskey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import {
  cacheLegacyRawVaultInnerKeyMaterial,
  clearVaultInnerKeyMaterial,
  createPasskeyEncryptedVaultKey,
} from "@/modules/vault/core/envelopes/vault-inner-key-material";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import { PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE } from "@/lib/passkey/messages";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

async function nonExtractableCopyOf(key: CryptoKey): Promise<CryptoKey> {
  const raw = await exportUserVaultKey(key);
  return importUserVaultKey(raw, { extractable: false });
}

describe("createPasskeyEncryptedVaultKey (non-extractable session UVK)", () => {
  beforeEach(() => {
    clearVaultInnerKeyMaterial();
  });

  it("wraps a non-extractable session key using cached inner material", async () => {
    const extractable = await createUserVaultKey();
    const raw = await exportUserVaultKey(extractable);
    cacheLegacyRawVaultInnerKeyMaterial(raw);
    const sessionKey = await importUserVaultKey(raw, { extractable: false });

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const encryptedVaultKey = await createPasskeyEncryptedVaultKey(sessionKey, prfOutput, scope);

    // The envelope decrypts back to the same UVK with the same PRF output.
    const unwrapped = await unwrapVaultKeyFromPasskey(
      encryptedVaultKey as never,
      prfOutput,
      scope,
      SELAHKEEP_VAULT_PROFILE
    );
    expect(await userVaultKeysEqual(unwrapped, sessionKey)).toBe(true);
  });

  it("fails with a re-unlock message when no inner material is cached", async () => {
    const extractable = await createUserVaultKey();
    const sessionKey = await nonExtractableCopyOf(extractable);
    clearVaultInnerKeyMaterial();

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    await expect(
      createPasskeyEncryptedVaultKey(sessionKey, prfOutput, scope)
    ).rejects.toThrow(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
  });

  it("rejects cached material that does not match the session key", async () => {
    const other = await createUserVaultKey();
    cacheLegacyRawVaultInnerKeyMaterial(await exportUserVaultKey(other));

    const sessionKey = await nonExtractableCopyOf(await createUserVaultKey());
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));

    // Mismatched cache is discarded, then the non-extractable wrap fails closed.
    await expect(
      createPasskeyEncryptedVaultKey(sessionKey, prfOutput, scope)
    ).rejects.toThrow(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
  });

  it("wraps directly when the session key is still extractable (fresh setup)", async () => {
    const extractable = await createUserVaultKey();
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const encryptedVaultKey: EncryptedPayload = await createPasskeyEncryptedVaultKey(
      extractable,
      prfOutput,
      scope
    );
    const unwrapped = await unwrapVaultKeyFromPasskey(
      encryptedVaultKey as never,
      prfOutput,
      scope,
      SELAHKEEP_VAULT_PROFILE
    );
    expect(await userVaultKeysEqual(unwrapped, extractable)).toBe(true);
  });
});
