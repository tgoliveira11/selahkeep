import { apiClient } from "./client";
import type { EncryptedKanbanVersionPayload } from "@/lib/crypto-client/kanban";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { CreateKanbanVersionInput } from "@/lib/validation/kanban";

export interface KanbanVersionResponse {
  id: string;
  boardId: string;
  noteId: string | null;
  vaultId: string;
  versionNumber: number;
  encryptedBoard: EncryptedPayload;
  encryptedWrappedKey: EncryptedPayload;
  boardEncryptionVersion: string;
  createdAt: string;
}

export const kanbanVersionsApi = {
  list: (boardId: string) =>
    apiClient.get<KanbanVersionResponse[]>(`/api/kanban/${boardId}/versions`),
  get: (boardId: string, versionId: string) =>
    apiClient.get<KanbanVersionResponse>(`/api/kanban/${boardId}/versions/${versionId}`),
  create: (
    boardId: string,
    payload: CreateKanbanVersionInput | EncryptedKanbanVersionPayload
  ) => apiClient.post<KanbanVersionResponse>(`/api/kanban/${boardId}/versions`, payload),
};
