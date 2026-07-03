import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import {
  clearVaultInnerKeyMaterial,
  createPasskeyEncryptedVaultKey,
} from "@/modules/vault/core/envelopes/vault-inner-key-material";
import {
  normalizeVaultKeyEnvelopeAadContext,
  shouldRoutePasskeyVaultKeyToLegacyUnlock,
} from "@/modules/vault/core/envelopes/legacy-envelope-unlock";
import { unlockVaultFromPasskeyEnvelope } from "@/lib/crypto-client/passkey-vault";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

describe("passkey vault-key AAD context unlock routing", () => {
  beforeEach(() => clearVaultInnerKeyMaterial());

  it("routes missing stored context to vault-core after normalization (not legacy raw path)", async () => {
    const uvk = await createUserVaultKey();
    const prf = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await createPasskeyEncryptedVaultKey(uvk, prf, scope);

    const stripped = structuredClone(envelope);
    delete (stripped.aad as { context?: string }).context;
    const parsed = encryptedPayloadSchema.parse(stripped);

    expect(shouldRoutePasskeyVaultKeyToLegacyUnlock(parsed)).toBe(false);
    expect(normalizeVaultKeyEnvelopeAadContext(parsed).aad.context).toBe(
      SELAHKEEP_VAULT_PROFILE.aadContextEnvelope
    );

    const restored = await unlockVaultFromPasskeyEnvelope(USER_ID, parsed, prf, {
      applySession: false,
    });
    expect(await userVaultKeysEqual(restored, uvk)).toBe(true);
  });

  it("routes null stored context to vault-core after normalization", async () => {
    const uvk = await createUserVaultKey();
    const prf = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await createPasskeyEncryptedVaultKey(uvk, prf, scope);

    const withNullContext = {
      ...envelope,
      aad: { ...envelope.aad, context: null },
    };
    const parsed = encryptedPayloadSchema.parse(withNullContext);

    expect(shouldRoutePasskeyVaultKeyToLegacyUnlock(parsed)).toBe(false);

    const restored = await unlockVaultFromPasskeyEnvelope(USER_ID, parsed, prf, {
      applySession: false,
    });
    expect(await userVaultKeysEqual(restored, uvk)).toBe(true);
  });

  it("routes explicit non-profile context tags to legacy passkey decrypt", () => {
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
    expect(shouldRoutePasskeyVaultKeyToLegacyUnlock(payload)).toBe(true);
  });
});
