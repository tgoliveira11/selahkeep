import { apiClient } from "./client";
import type { EncryptedNotePayload } from "@/lib/crypto-client/notes";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export interface NoteResponse {
  id: string;
  vaultId: string;
  encryptedMetadata: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedWrappedNoteKey: EncryptedPayload;
  bodyEncryptionVersion: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const notesApi = {
  list: () => apiClient.get<NoteResponse[]>("/api/notes"),
  get: (id: string) => apiClient.get<NoteResponse>(`/api/notes/${id}`),
  create: (payload: EncryptedNotePayload & { id: string }) =>
    apiClient.post<NoteResponse>("/api/notes", payload),
  update: (id: string, payload: Partial<EncryptedNotePayload>) =>
    apiClient.put<NoteResponse>(`/api/notes/${id}`, payload),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/api/notes/${id}`),
};
