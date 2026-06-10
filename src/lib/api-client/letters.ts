import { apiClient } from "./client";
import type { EncryptedLetterPayload } from "@/lib/crypto-client/letters";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export interface LetterResponse {
  id: string;
  userId: string;
  encryptedTitle: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedLetterKey: EncryptedPayload;
  encryptionVersion: string;
  answered: boolean;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const lettersApi = {
  list: () => apiClient.get<LetterResponse[]>("/api/letters"),
  get: (id: string) => apiClient.get<LetterResponse>(`/api/letters/${id}`),
  create: (payload: EncryptedLetterPayload & { id: string; answered?: boolean }) =>
    apiClient.post<LetterResponse>("/api/letters", payload),
  update: (id: string, payload: Partial<EncryptedLetterPayload> & { answered?: boolean }) =>
    apiClient.put<LetterResponse>(`/api/letters/${id}`, payload),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/api/letters/${id}`),
};
