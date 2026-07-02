const IV_LENGTH = 12;

export type EncryptedPayload = {
  version: "enc-v1";
  alg: "AES-GCM";
  iv: string;
  ciphertext: string;
  aad: {
    userId: string;
    resourceId: string;
    field: string;
    integrationId?: string;
  };
};

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

function canonicalAadString(aad: EncryptedPayload["aad"]): string {
  const base: Record<string, string> = {
    field: aad.field,
    resourceId: aad.resourceId,
    userId: aad.userId,
  };
  if (aad.field === "integration_grant" && aad.integrationId) {
    base.integrationId = aad.integrationId;
  }
  return JSON.stringify(base);
}

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", toBufferSource(raw), { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function importIntegrationKey(encoded: string): Promise<CryptoKey> {
  return importAesKey(base64UrlToBytes(encoded));
}

async function decryptField(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const iv = base64UrlToBytes(payload.iv);
  const ciphertext = base64UrlToBytes(payload.ciphertext);
  const aad = new TextEncoder().encode(canonicalAadString(payload.aad));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBufferSource(iv), additionalData: aad },
    key,
    toBufferSource(ciphertext)
  );
  return new TextDecoder().decode(plain);
}

async function encryptField(
  plaintext: string,
  key: CryptoKey,
  aad: EncryptedPayload["aad"]
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const aadBytes = new TextEncoder().encode(canonicalAadString(aad));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aadBytes },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    version: "enc-v1",
    alg: "AES-GCM",
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    aad,
  };
}

export async function unwrapGrantKey(
  grant: EncryptedPayload,
  integrationKey: CryptoKey
): Promise<CryptoKey> {
  if (grant.aad.field !== "integration_grant" || !grant.aad.integrationId) {
    throw new Error("Invalid integration grant");
  }
  const exported = await decryptField(grant, integrationKey);
  return importAesKey(base64UrlToBytes(exported));
}

export async function decryptNoteMetadata(payload: EncryptedPayload, noteKey: CryptoKey) {
  const json = await decryptField(payload, noteKey);
  return JSON.parse(json) as { title?: string; categoryId?: string | null; tagIds?: string[] };
}

export async function decryptNoteBody(payload: EncryptedPayload, noteKey: CryptoKey) {
  return decryptField(payload, noteKey);
}

export async function encryptNoteMetadata(
  userId: string,
  noteId: string,
  metadata: Record<string, unknown>,
  noteKey: CryptoKey
) {
  return encryptField(JSON.stringify(metadata), noteKey, {
    userId,
    resourceId: noteId,
    field: "note_metadata",
  });
}

export async function encryptNoteBody(
  userId: string,
  noteId: string,
  body: string,
  noteKey: CryptoKey
) {
  return encryptField(body, noteKey, {
    userId,
    resourceId: noteId,
    field: "note_body",
  });
}

export async function decryptKanbanBoard(payload: EncryptedPayload, boardKey: CryptoKey) {
  const json = await decryptField(payload, boardKey);
  return JSON.parse(json);
}

export async function encryptKanbanBoard(
  userId: string,
  boardId: string,
  board: Record<string, unknown>,
  boardKey: CryptoKey
) {
  return encryptField(JSON.stringify(board), boardKey, {
    userId,
    resourceId: boardId,
    field: "note_kanban_board",
  });
}
