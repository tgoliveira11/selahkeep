import { apiClient } from "./client";

export interface AccountDeletionRequirements {
  requiresPassword: boolean;
  authProvider: string;
  confirmationPhrase: string;
}

export const accountApi = {
  getDeletionRequirements: () => apiClient.get<AccountDeletionRequirements>("/api/account"),
  deleteAccount: (payload: { confirmationPhrase: string; password?: string }) =>
    apiClient.delete<{ success: boolean }>("/api/account", payload),
};
