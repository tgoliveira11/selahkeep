import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import { generateAesKey, exportAesKey, importAesKey, encryptField, decryptField } from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { getSessionVaultKey } from "./vault";

export const TITLE_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 20_000;

export interface EncryptedLetterPayload {
  encryptedTitle: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedLetterKey: EncryptedPayload;
  encryptionVersion: typeof ENCRYPTION_VERSION;
}

export interface DecryptedLetter {
  title: string;
  body: string;
}

export async function encryptLetter(
  userId: string,
  letterId: string,
  title: string,
  body: string,
  vaultKey?: CryptoKey
): Promise<EncryptedLetterPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  if (title.length > TITLE_MAX_LENGTH) throw new Error("Title too long");
  if (body.length > BODY_MAX_LENGTH) throw new Error("Body too long");

  const letterKey = await generateAesKey();
  const encryptedTitle = await encryptField(title, letterKey, {
    userId,
    resourceId: letterId,
    field: "title",
  });
  const encryptedBody = await encryptField(body, letterKey, {
    userId,
    resourceId: letterId,
    field: "body",
  });

  const letterKeyBytes = await exportAesKey(letterKey);
  const letterKeyB64 = bytesToBase64Url(letterKeyBytes);
  const encryptedLetterKey = await encryptField(letterKeyB64, key, {
    userId,
    resourceId: letterId,
    field: "letter_key",
  });

  return {
    encryptedTitle,
    encryptedBody,
    encryptedLetterKey,
    encryptionVersion: ENCRYPTION_VERSION,
  };
}

export async function decryptLetter(
  encryptedTitle: EncryptedPayload,
  encryptedBody: EncryptedPayload,
  encryptedLetterKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<DecryptedLetter> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  const { userId, resourceId } = encryptedLetterKey.aad;
  verifyPayloadAad(encryptedLetterKey, { userId, resourceId, field: "letter_key" });
  verifyPayloadAad(encryptedTitle, { userId, resourceId, field: "title" });
  verifyPayloadAad(encryptedBody, { userId, resourceId, field: "body" });

  const letterKeyB64 = await decryptField(encryptedLetterKey, key);
  const letterKeyBytes = base64UrlToBytes(letterKeyB64);
  const letterKey = await importAesKey(letterKeyBytes);

  const title = await decryptField(encryptedTitle, letterKey);
  const body = await decryptField(encryptedBody, letterKey);

  return { title, body };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
