import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  createPasswordEnvelope,
  deriveVaultPasswordKeyPairFromMetadata,
  exportUserVaultKey,
  importUserVaultKey,
  unwrapVaultKeyFromPasskey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import {
  cacheVaultInnerKeyMaterialFromEnvelope,
  clearVaultInnerKeyMaterial,
  createPasskeyEncryptedVaultKey,
} from "@/modules/vault/core/envelopes/vault-inner-key-material";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

describe("passkey envelope from password-unlock cached inner blob", () => {
  beforeEach(() => clearVaultInnerKeyMaterial());

  it("round-trips: envelope decrypts back to the original UVK", async () => {
    // 1. A vault exists with a password envelope.
    const uvk = await createUserVaultKey();
    const { envelope, kdfMetadata } = await createPasswordEnvelope(
      uvk,
      "correct horse battery staple",
      scope,
      SELAHKEEP_VAULT_PROFILE
    );

    // 2. Password unlock caches inner material from that envelope.
    const derived = await deriveVaultPasswordKeyPairFromMetadata(
      "correct horse battery staple",
      kdfMetadata
    );
    await cacheVaultInnerKeyMaterialFromEnvelope(
      envelope.encryptedVaultKey as never,
      derived.encryptionKey,
      derived.wrappingKey
    );

    // 3. Session key is non-extractable (as after unlock).
    const raw = await exportUserVaultKey(uvk);
    const sessionKey = await importUserVaultKey(raw, { extractable: false });

    // 4. Enroll passkey -> envelope from cached material.
    const prf = crypto.getRandomValues(new Uint8Array(32));
    const passkeyEnvelope = await createPasskeyEncryptedVaultKey(sessionKey, prf, scope);

    // 5. Unlock decrypts it back to the same UVK.
    const unwrapped = await unwrapVaultKeyFromPasskey(
      passkeyEnvelope as never,
      prf,
      scope,
      SELAHKEEP_VAULT_PROFILE
    );
    expect(await userVaultKeysEqual(unwrapped, sessionKey)).toBe(true);
  });
});
