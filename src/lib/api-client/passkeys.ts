import { apiClient } from "./client";

export const passkeysApi = {
  removeAll: () => apiClient.delete<{ success: boolean }>("/api/passkeys"),
};
