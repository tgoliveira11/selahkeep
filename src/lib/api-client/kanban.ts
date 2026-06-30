import { apiClient } from "./client";
import type { EncryptedKanbanBoardPayload } from "@/lib/crypto-client/kanban";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type {
  CreateKanbanBoardInput,
  ListKanbanBoardsQuery,
  UpdateKanbanBoardInput,
} from "@/lib/validation/kanban";

export interface KanbanBoardResponse {
  id: string;
  noteId: string | null;
  vaultId: string;
  encryptedBoard: EncryptedPayload;
  encryptedWrappedKey: EncryptedPayload;
  boardEncryptionVersion: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

function kanbanListPath(query: ListKanbanBoardsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.noteId) params.set("noteId", query.noteId);
  if (query.scope) params.set("scope", query.scope);
  const suffix = params.toString();
  return suffix ? `/api/kanban?${suffix}` : "/api/kanban";
}

export const kanbanApi = {
  list: (query?: ListKanbanBoardsQuery) =>
    apiClient.get<KanbanBoardResponse[]>(kanbanListPath(query)),
  get: (boardId: string) => apiClient.get<KanbanBoardResponse>(`/api/kanban/${boardId}`),
  create: (payload: CreateKanbanBoardInput | (EncryptedKanbanBoardPayload & { noteId: string | null })) =>
    apiClient.post<KanbanBoardResponse>("/api/kanban", payload),
  update: (boardId: string, payload: UpdateKanbanBoardInput | EncryptedKanbanBoardPayload) =>
    apiClient.put<KanbanBoardResponse>(`/api/kanban/${boardId}`, payload),
  delete: (boardId: string) =>
    apiClient.delete<{ success: boolean }>(`/api/kanban/${boardId}`),
};
