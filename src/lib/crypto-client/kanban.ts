import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import { ENCRYPTION_VERSION } from "@/lib/validation/encrypted-payload";
import {
  decryptField,
  encryptField,
  exportAesKey,
  generateAesKey,
  importAesKey,
} from "./aes-gcm";
import { verifyPayloadAad } from "./aad-verify";
import { bytesToBase64Url, base64UrlToBytes } from "./encoding";
import { unwrapNoteKey } from "./note-key";
import { getSessionVaultKey } from "./vault";

export interface EncryptedKanbanBoardPayload {
  id: string;
  encryptedBoard: EncryptedPayload;
  encryptedWrappedKey: EncryptedPayload;
  boardEncryptionVersion: typeof ENCRYPTION_VERSION;
}

export interface EncryptedKanbanVersionPayload {
  id: string;
  encryptedBoard: EncryptedPayload;
  encryptedWrappedKey: EncryptedPayload;
  boardEncryptionVersion: typeof ENCRYPTION_VERSION;
}

export async function generateBoardKey(): Promise<CryptoKey> {
  return generateAesKey();
}

export async function wrapBoardKey(
  userId: string,
  boardId: string,
  boardKey: CryptoKey,
  vaultKey?: CryptoKey
): Promise<EncryptedPayload> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  const boardKeyB64 = bytesToBase64Url(await exportAesKey(boardKey));
  return encryptField(boardKeyB64, key, {
    userId,
    resourceId: boardId,
    field: "note_kanban_key",
  });
}

export async function unwrapBoardKey(
  encryptedWrappedBoardKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<CryptoKey> {
  const key = vaultKey ?? getSessionVaultKey();
  if (!key) throw new Error("Vault is locked");

  verifyPayloadAad(encryptedWrappedBoardKey, {
    userId: encryptedWrappedBoardKey.aad.userId,
    resourceId: encryptedWrappedBoardKey.aad.resourceId,
    field: "note_kanban_key",
  });

  const boardKeyB64 = await decryptField(encryptedWrappedBoardKey, key);
  return importAesKey(base64UrlToBytes(boardKeyB64));
}

export async function unwrapContentKey(
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<CryptoKey> {
  if (encryptedWrappedKey.aad.field === "note_kanban_key") {
    return unwrapBoardKey(encryptedWrappedKey, vaultKey);
  }
  if (encryptedWrappedKey.aad.field === "note_key") {
    return unwrapNoteKey(encryptedWrappedKey, vaultKey);
  }
  throw new Error("Unsupported kanban wrapped key field");
}

export async function encryptKanbanBoard(
  userId: string,
  boardId: string,
  board: KanbanBoardPlaintext,
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<EncryptedKanbanBoardPayload> {
  const contentKey = await unwrapContentKey(encryptedWrappedKey, vaultKey);
  const encryptedBoard = await encryptField(JSON.stringify(board), contentKey, {
    userId,
    resourceId: boardId,
    field: "note_kanban_board",
  });

  return {
    id: boardId,
    encryptedBoard,
    encryptedWrappedKey,
    boardEncryptionVersion: ENCRYPTION_VERSION,
  };
}

export async function decryptKanbanBoard(
  encryptedBoard: EncryptedPayload,
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<KanbanBoardPlaintext> {
  const contentKey = await unwrapContentKey(encryptedWrappedKey, vaultKey);
  const boardId = encryptedBoard.aad.resourceId;
  verifyPayloadAad(encryptedBoard, {
    userId: encryptedBoard.aad.userId,
    resourceId: boardId,
    field: "note_kanban_board",
  });

  return JSON.parse(await decryptField(encryptedBoard, contentKey)) as KanbanBoardPlaintext;
}

export async function encryptKanbanVersion(
  userId: string,
  versionId: string,
  board: KanbanBoardPlaintext,
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<EncryptedKanbanVersionPayload> {
  const contentKey = await unwrapContentKey(encryptedWrappedKey, vaultKey);
  const encryptedBoard = await encryptField(JSON.stringify(board), contentKey, {
    userId,
    resourceId: versionId,
    field: "note_kanban_version",
  });

  return {
    id: versionId,
    encryptedBoard,
    encryptedWrappedKey,
    boardEncryptionVersion: ENCRYPTION_VERSION,
  };
}

export async function decryptKanbanVersion(
  encryptedBoard: EncryptedPayload,
  encryptedWrappedKey: EncryptedPayload,
  vaultKey?: CryptoKey
): Promise<KanbanBoardPlaintext> {
  const contentKey = await unwrapContentKey(encryptedWrappedKey, vaultKey);
  const versionId = encryptedBoard.aad.resourceId;
  verifyPayloadAad(encryptedBoard, {
    userId: encryptedBoard.aad.userId,
    resourceId: versionId,
    field: "note_kanban_version",
  });

  return JSON.parse(await decryptField(encryptedBoard, contentKey)) as KanbanBoardPlaintext;
}
