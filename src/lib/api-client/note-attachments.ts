import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { CreateAttachmentInput } from "@/lib/validation/note-attachments";

export type AttachmentOwnerRef = { kind: "note" | "board"; id: string };

export interface NoteAttachmentRecord {
  id: string;
  noteId: string | null;
  boardId: string | null;
  vaultId: string;
  encryptedMetadata: EncryptedPayload;
  encryptedBlob: EncryptedPayload;
  blobEncryptionVersion: string;
  ciphertextBytes: number;
  createdAt: string;
}

export interface StorageUsageResponse {
  notesCiphertextBytes: number;
  attachmentsCiphertextBytes: number;
  totalCiphertextBytes: number;
  maxBytes: number;
  partial: boolean;
}

function ownerBasePath(owner: AttachmentOwnerRef): string {
  return owner.kind === "note" ? `/api/notes/${owner.id}` : `/api/kanban/${owner.id}`;
}

export const noteAttachmentsApi = {
  list(owner: AttachmentOwnerRef): Promise<{ attachments: NoteAttachmentRecord[] }> {
    return apiClient.get(`${ownerBasePath(owner)}/attachments`);
  },

  create(owner: AttachmentOwnerRef, input: CreateAttachmentInput): Promise<NoteAttachmentRecord> {
    return apiClient.post(`${ownerBasePath(owner)}/attachments`, input);
  },

  get(owner: AttachmentOwnerRef, attachmentId: string): Promise<NoteAttachmentRecord> {
    return apiClient.get(`${ownerBasePath(owner)}/attachments/${attachmentId}`);
  },

  delete(owner: AttachmentOwnerRef, attachmentId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`${ownerBasePath(owner)}/attachments/${attachmentId}`);
  },
};

export const storageUsageApi = {
  get(): Promise<StorageUsageResponse> {
    return apiClient.get("/api/vault/storage-usage");
  },
};
