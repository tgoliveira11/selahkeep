import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  createPasswordEnvelope,
  exportUserVaultKey,
  importUserVaultKey,
  unwrapVaultKeyFromPasskey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import {
  cacheVaultInnerKeyMaterialAfterPasswordUnlock,
  clearVaultInnerKeyMaterialCache,
  getCachedVaultInnerKeyMaterial,
} from "@tgoliveira/vault-core/browser";
import { wrapVaultKeyForPasskey } from "@/lib/crypto-client/passkey-vault";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

describe("passkey envelope from password-unlock cached inner blob", () => {
  beforeEach(() => clearVaultInnerKeyMaterialCache());

  it("round-trips: envelope decrypts back to the original UVK", async () => {
    const uvk = await createUserVaultKey();
    const { envelope, kdfMetadata } = await createPasswordEnvelope(
      uvk,
      "correct horse battery staple",
      scope,
      SELAHKEEP_VAULT_PROFILE
    );

    const raw = await exportUserVaultKey(uvk);
    const sessionKey = await importUserVaultKey(raw, { extractable: false });
    await cacheVaultInnerKeyMaterialAfterPasswordUnlock(
      sessionKey,
      { encryptedVaultKey: envelope.encryptedVaultKey, kdfMetadata },
      "correct horse battery staple"
    );
    expect(getCachedVaultInnerKeyMaterial()).not.toBeNull();

    const prf = crypto.getRandomValues(new Uint8Array(32));
    const passkeyEnvelope = await wrapVaultKeyForPasskey(sessionKey, prf, USER_ID, USER_ID);

    const unwrapped = await unwrapVaultKeyFromPasskey(
      passkeyEnvelope as never,
      prf,
      scope,
      SELAHKEEP_VAULT_PROFILE
    );
    expect(await userVaultKeysEqual(unwrapped, sessionKey)).toBe(true);
  });
});
