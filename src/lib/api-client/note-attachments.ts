import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { CreateAttachmentInput } from "@/lib/validation/note-attachments";

export interface NoteAttachmentRecord {
  id: string;
  noteId: string;
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

export const noteAttachmentsApi = {
  list(noteId: string): Promise<{ attachments: NoteAttachmentRecord[] }> {
    return apiClient.get(`/api/notes/${noteId}/attachments`);
  },

  create(noteId: string, input: CreateAttachmentInput): Promise<NoteAttachmentRecord> {
    return apiClient.post(`/api/notes/${noteId}/attachments`, input);
  },

  get(noteId: string, attachmentId: string): Promise<NoteAttachmentRecord> {
    return apiClient.get(`/api/notes/${noteId}/attachments/${attachmentId}`);
  },

  delete(noteId: string, attachmentId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/api/notes/${noteId}/attachments/${attachmentId}`);
  },
};

export const storageUsageApi = {
  get(): Promise<StorageUsageResponse> {
    return apiClient.get("/api/vault/storage-usage");
  },
};
