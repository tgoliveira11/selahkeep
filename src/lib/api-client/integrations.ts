import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export interface IntegrationListItem {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  tokenPrefix: string | null;
  lastUsedAt: string | null;
}

export interface CreateIntegrationResponse {
  integration: {
    id: string;
    name: string;
    type: string;
    createdAt: string;
    tokenPrefix: string;
  };
  token: string;
  integrationId: string;
}

export interface IntegrationGrantSummary {
  id: string;
  resourceType: "note" | "kanban_board";
  resourceId: string;
  permissions: "read" | "write";
  createdAt: string;
}

export interface UpsertGrantPayload {
  grants: Array<{
    resourceType: "note" | "kanban_board";
    resourceId: string;
    permissions: "read" | "write";
    encryptedWrappedKey: EncryptedPayload;
  }>;
}

export const integrationsApi = {
  list: () => apiClient.get<IntegrationListItem[]>("/api/integrations"),
  create: (name: string) =>
    apiClient.post<CreateIntegrationResponse>("/api/integrations", { name, type: "mcp" }),
  revoke: (id: string) => apiClient.delete<{ ok: boolean }>(`/api/integrations/${id}`),
  listGrants: (id: string) =>
    apiClient.get<IntegrationGrantSummary[]>(`/api/integrations/${id}/grants`),
  upsertGrants: (id: string, payload: UpsertGrantPayload) =>
    apiClient.put<IntegrationGrantSummary[]>(`/api/integrations/${id}/grants`, payload),
};
