import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import {
  decryptField,
  encryptField,
  exportAesKey,
  importAesKey,
} from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { bytesToBase64Url, base64UrlToBytes, stringToBytes, toBufferSource } from "./encoding";
import { getSessionVaultKey } from "./vault";

const INTEGRATION_HKDF_SALT = "selahkeep:integration:v1";

export async function deriveIntegrationKey(
  integrationId: string,
  vaultKey?: CryptoKey
): Promise<CryptoKey> {
  const uvk = vaultKey ?? getSessionVaultKey();
  if (!uvk) throw new Error("Vault is locked");

  const uvkBytes = await exportAesKey(uvk);
  const hkdfKey = await crypto.subtle.importKey("raw", toBufferSource(uvkBytes), "HKDF", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toBufferSource(stringToBytes(INTEGRATION_HKDF_SALT)),
      info: toBufferSource(stringToBytes(integrationId)),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportIntegrationKeyBase64Url(integrationKey: CryptoKey): Promise<string> {
  return bytesToBase64Url(await exportAesKey(integrationKey));
}

export async function importIntegrationKeyFromBase64Url(encoded: string): Promise<CryptoKey> {
  return importAesKey(base64UrlToBytes(encoded));
}

export async function wrapResourceKeyForIntegration(
  userId: string,
  integrationId: string,
  resourceId: string,
  resourceKey: CryptoKey,
  integrationKey?: CryptoKey
): Promise<EncryptedPayload> {
  const iek = integrationKey ?? (await deriveIntegrationKey(integrationId));
  const keyB64 = bytesToBase64Url(await exportAesKey(resourceKey));
  return encryptField(keyB64, iek, {
    userId,
    resourceId,
    integrationId,
    field: "integration_grant",
  });
}

export async function unwrapResourceKeyFromGrant(
  encryptedWrappedKey: EncryptedPayload,
  integrationKey: CryptoKey
): Promise<CryptoKey> {
  verifyPayloadAad(encryptedWrappedKey, {
    userId: encryptedWrappedKey.aad.userId,
    resourceId: encryptedWrappedKey.aad.resourceId,
    integrationId: encryptedWrappedKey.aad.integrationId,
    field: "integration_grant",
  });

  if (!encryptedWrappedKey.aad.integrationId) {
    throw new Error("Integration grant missing integrationId in AAD");
  }

  const keyB64 = await decryptField(encryptedWrappedKey, integrationKey);
  return importAesKey(base64UrlToBytes(keyB64));
}
