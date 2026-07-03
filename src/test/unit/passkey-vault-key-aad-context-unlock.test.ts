import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  exportUserVaultKey,
  importUserVaultKey,
  isLegacyVaultKeyEnvelope,
  normalizeEnvelopeAadContext,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import { clearVaultInnerKeyMaterialCache } from "@tgoliveira/vault-core/browser";
import { unlockVaultFromPasskeyEnvelope, wrapVaultKeyForPasskey } from "@/lib/crypto-client/passkey-vault";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("passkey vault-key AAD context unlock routing", () => {
  beforeEach(() => clearVaultInnerKeyMaterialCache());

  it("unlocks envelopes with missing stored context after vault-core normalization", async () => {
    const uvk = await createUserVaultKey();
    const prf = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await wrapVaultKeyForPasskey(uvk, prf, USER_ID, USER_ID);

    const stripped = structuredClone(envelope);
    delete (stripped.aad as { context?: string }).context;
    const parsed = encryptedPayloadSchema.parse(stripped);

    expect(isLegacyVaultKeyEnvelope(parsed, SELAHKEEP_VAULT_PROFILE)).toBe(true);
    expect(normalizeEnvelopeAadContext(parsed, SELAHKEEP_VAULT_PROFILE).aad.context).toBe(
      SELAHKEEP_VAULT_PROFILE.aadContextEnvelope
    );

    const restored = await unlockVaultFromPasskeyEnvelope(USER_ID, parsed, prf, {
      applySession: false,
    });
    expect(await userVaultKeysEqual(restored, uvk)).toBe(true);
  });

  it("unlocks envelopes with null stored context", async () => {
    const uvk = await createUserVaultKey();
    const prf = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await wrapVaultKeyForPasskey(uvk, prf, USER_ID, USER_ID);

    const withNullContext = {
      ...envelope,
      aad: { ...envelope.aad, context: null },
    };
    const parsed = encryptedPayloadSchema.parse(withNullContext);

    const restored = await unlockVaultFromPasskeyEnvelope(USER_ID, parsed, prf, {
      applySession: false,
    });
    expect(await userVaultKeysEqual(restored, uvk)).toBe(true);
  });

  it("marks explicit non-profile context tags as legacy", () => {
    const payload = {
      version: "enc-v1" as const,
      alg: "AES-GCM" as const,
      iv: "aXY",
      ciphertext: "Y2lwaGVydGV4dA",
      aad: {
        userId: USER_ID,
        resourceId: USER_ID,
        field: "vault_key" as const,
        context: SELAHKEEP_VAULT_PROFILE.aadContextVault,
      },
    };
    expect(isLegacyVaultKeyEnvelope(payload, SELAHKEEP_VAULT_PROFILE)).toBe(true);
  });
});
