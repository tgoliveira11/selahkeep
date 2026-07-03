import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  exportUserVaultKey,
  importUserVaultKey,
  unwrapVaultKeyFromPasskey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import { clearVaultInnerKeyMaterialCache } from "@tgoliveira/vault-core/browser";
import { wrapVaultKeyForPasskey } from "@/lib/crypto-client/passkey-vault";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import { PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE } from "@/lib/passkey/messages";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

async function cacheLegacyRawMaterial(raw: Uint8Array, sessionKey: CryptoKey): Promise<void> {
  const placeholderWrappingKey = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
  const { cacheVaultInnerKeyMaterialFromEnvelopeDecrypt } = await import(
    "@tgoliveira/vault-core/browser"
  );
  await cacheVaultInnerKeyMaterialFromEnvelopeDecrypt(raw, placeholderWrappingKey, sessionKey);
}

async function nonExtractableCopyOf(key: CryptoKey): Promise<CryptoKey> {
  const raw = await exportUserVaultKey(key);
  return importUserVaultKey(raw, { extractable: false });
}

describe("createPasskeyPrfEnvelopeWithSessionCache (non-extractable session UVK)", () => {
  beforeEach(() => {
    clearVaultInnerKeyMaterialCache();
  });

  it("wraps a non-extractable session key using cached inner material", async () => {
    const extractable = await createUserVaultKey();
    const raw = await exportUserVaultKey(extractable);
    const sessionKey = await importUserVaultKey(raw, { extractable: false });
    await cacheLegacyRawMaterial(raw, sessionKey);

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const encryptedVaultKey = await wrapVaultKeyForPasskey(
      sessionKey,
      prfOutput,
      USER_ID,
      USER_ID
    );

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
    clearVaultInnerKeyMaterialCache();

    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    await expect(
      wrapVaultKeyForPasskey(sessionKey, prfOutput, USER_ID, USER_ID)
    ).rejects.toThrow(PASSKEY_VAULT_UNLOCK_REWRAP_REQUIRES_UNLOCK_MESSAGE);
  });

  it("rejects cached material that does not match the session key", async () => {
    const other = await createUserVaultKey();
    const sessionKey = await nonExtractableCopyOf(await createUserVaultKey());
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));

    await expect(
      cacheLegacyRawMaterial(await exportUserVaultKey(other), sessionKey)
    ).rejects.toThrow("Inner vault key blob does not match the session vault key");
  });

  it("wraps directly when the session key is still extractable (fresh setup)", async () => {
    const extractable = await createUserVaultKey();
    const prfOutput = crypto.getRandomValues(new Uint8Array(32));
    const encryptedVaultKey: EncryptedPayload = await wrapVaultKeyForPasskey(
      extractable,
      prfOutput,
      USER_ID,
      USER_ID
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
