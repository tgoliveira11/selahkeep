import { describe, it, expect, beforeEach } from "vitest";
import {
  createUserVaultKey,
  exportUserVaultKey,
  importUserVaultKey,
  isLegacyVaultKeyEnvelope,
  unwrapVaultKeyFromPasskey,
  userVaultKeysEqual,
} from "@tgoliveira/vault-core";
import { clearVaultInnerKeyMaterialCache } from "@tgoliveira/vault-core/browser";
import { wrapVaultKeyForPasskey } from "@/lib/crypto-client/passkey-vault";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

describe("encryptedPayloadSchema preserves vault-core AAD context", () => {
  beforeEach(() => clearVaultInnerKeyMaterialCache());

  it("keeps aad.context through server-side parse so unlock is not misrouted to legacy", async () => {
    const uvk = await createUserVaultKey();
    const prf = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await wrapVaultKeyForPasskey(uvk, prf, USER_ID, USER_ID);

    expect(envelope.aad.context).toBe(SELAHKEEP_VAULT_PROFILE.aadContextEnvelope);

    const parsed = encryptedPayloadSchema.parse(envelope);
    expect(parsed.aad.context).toBe(SELAHKEEP_VAULT_PROFILE.aadContextEnvelope);

    expect(isLegacyVaultKeyEnvelope(parsed, SELAHKEEP_VAULT_PROFILE)).toBe(false);

    const restored = await unwrapVaultKeyFromPasskey(
      parsed as never,
      prf,
      scope,
      SELAHKEEP_VAULT_PROFILE
    );
    expect(await userVaultKeysEqual(restored, uvk)).toBe(true);
  });
});
