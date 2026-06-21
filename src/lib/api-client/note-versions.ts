import { apiClient } from "./client";
import type { EncryptedNoteVersionPayload } from "@/lib/crypto-client/note-versions";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export interface NoteVersionResponse {
  id: string;
  noteId: string;
  vaultId: string;
  versionNumber: number;
  encryptedMetadata: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedWrappedNoteKey: EncryptedPayload;
  bodyEncryptionVersion: string;
  createdAt: string;
}

export const noteVersionsApi = {
  list: (noteId: string) =>
    apiClient.get<NoteVersionResponse[]>(`/api/notes/${noteId}/versions`),
  get: (noteId: string, versionId: string) =>
    apiClient.get<NoteVersionResponse>(`/api/notes/${noteId}/versions/${versionId}`),
  create: (noteId: string, payload: EncryptedNoteVersionPayload) =>
    apiClient.post<NoteVersionResponse>(`/api/notes/${noteId}/versions`, payload),
};
