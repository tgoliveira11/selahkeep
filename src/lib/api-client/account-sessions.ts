import { apiClient } from "@/lib/api-client/client";
import type { AccountSessionView } from "@/lib/account-session-types";

export const accountSessionsApi = {
  list: () =>
    apiClient.get<{ sessions: AccountSessionView[] }>("/api/account/sessions"),

  ping: () => apiClient.post<{ ok: true }>("/api/account/sessions/ping", {}),

  revokeCurrent: () =>
    apiClient.post<{ revoked: boolean }>("/api/account/sessions/revoke-current", {}),

  revoke: (sessionId: string) =>
    apiClient.delete<{ revoked: boolean; signOut: boolean }>(
      `/api/account/sessions/${sessionId}`
    ),

  revokeOthers: () =>
    apiClient.post<{ revokedCount: number }>("/api/account/sessions/revoke-others", {}),

  revokeAll: () =>
    apiClient.post<{ revokedCount: number; signOut: boolean }>(
      "/api/account/sessions/revoke-all",
      {}
    ),
};
