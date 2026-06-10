import {
  ENCRYPTION_ALG,
  ENCRYPTION_VERSION,
  type EncryptedPayload,
} from "@/lib/validation/encrypted-payload";
import {
  bytesToBase64Url,
  base64UrlToBytes,
  stringToBytes,
  bytesToString,
  toBufferSource,
} from "./encoding";
import { canonicalAadString, aadByteCandidates } from "./aad";

const IV_LENGTH = 12; // 96 bits

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ENCRYPTION_ALG, length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toBufferSource(rawKey), { name: ENCRYPTION_ALG, length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportAesKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export async function encryptField(
  plaintext: string,
  key: CryptoKey,
  aad: { userId: string; resourceId: string; field: EncryptedPayload["aad"]["field"] }
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const aadBytes = stringToBytes(canonicalAadString(aad));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALG,
      iv: toBufferSource(iv),
      additionalData: toBufferSource(aadBytes),
    },
    key,
    toBufferSource(stringToBytes(plaintext))
  );

  return {
    version: ENCRYPTION_VERSION,
    alg: ENCRYPTION_ALG,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertextBuffer)),
    aad,
  };
}

export async function decryptField(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const iv = base64UrlToBytes(payload.iv);
  const ciphertext = base64UrlToBytes(payload.ciphertext);
  let lastError: unknown;

  for (const aadBytes of aadByteCandidates(payload.aad)) {
    try {
      const plaintextBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_ALG,
          iv: toBufferSource(iv),
          additionalData: toBufferSource(aadBytes),
        },
        key,
        toBufferSource(ciphertext)
      );
      return bytesToString(new Uint8Array(plaintextBuffer));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Decryption failed");
}
