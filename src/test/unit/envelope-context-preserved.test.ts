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
import { isLegacyVaultKeyEnvelope } from "@/modules/vault/core/envelopes/legacy-envelope-unlock";
import { SELAHKEEP_VAULT_PROFILE } from "@/modules/vault/selahkeep-profile";
import { encryptedPayloadSchema } from "@/lib/validation/encrypted-payload";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const scope = { userId: USER_ID, resourceId: USER_ID };

describe("encryptedPayloadSchema preserves vault-core AAD context", () => {
  beforeEach(() => clearVaultInnerKeyMaterial());

  it("keeps aad.context through server-side parse so unlock is not misrouted to legacy", async () => {
    const uvk = await createUserVaultKey();
    const raw = await exportUserVaultKey(uvk);
    cacheLegacyRawVaultInnerKeyMaterial(raw);
    const sessionKey = await importUserVaultKey(raw, { extractable: false });

    const prf = crypto.getRandomValues(new Uint8Array(32));
    const envelope = await createPasskeyEncryptedVaultKey(sessionKey, prf, scope);

    // vault-core stamps the envelope AAD context.
    expect(envelope.aad.context).toBe(SELAHKEEP_VAULT_PROFILE.aadContextEnvelope);

    // The server round-trip (Zod parse) must NOT strip it.
    const parsed = encryptedPayloadSchema.parse(envelope);
    expect(parsed.aad.context).toBe(SELAHKEEP_VAULT_PROFILE.aadContextEnvelope);

    // With context intact, the envelope is classified as vault-core (not legacy),
    // so unlock routes to the AES-KW-aware unwrap and decrypts correctly.
    expect(isLegacyVaultKeyEnvelope(parsed)).toBe(false);
    const unwrapped = await unwrapVaultKeyFromPasskey(
      parsed as never,
      prf,
      scope,
      SELAHKEEP_VAULT_PROFILE
    );
    expect(await userVaultKeysEqual(unwrapped, sessionKey)).toBe(true);
  });
});
