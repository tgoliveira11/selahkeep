import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export interface TrustedDeviceResponse {
  id: string;
  userId: string;
  deviceName: string;
  devicePublicKey: Record<string, unknown> | null;
  browser: string | null;
  platform: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export const trustedDevicesApi = {
  list: () => apiClient.get<TrustedDeviceResponse[]>("/api/trusted-devices"),
  create: (payload: {
    deviceName: string;
    devicePublicKey?: Record<string, unknown>;
    browser?: string;
    platform?: string;
    encryptedVaultKey: EncryptedPayload;
  }) => apiClient.post<TrustedDeviceResponse>("/api/trusted-devices", payload),
  revoke: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/trusted-devices/${id}`),
};
