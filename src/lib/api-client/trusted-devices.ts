import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

export interface TrustedDeviceResponse {
  id: string;
  userId: string;
  deviceName: string;
  devicePublicKey: Record<string, unknown> | null;
  browser: string | null;
  platform: string | null;
  deviceType: string | null;
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
    deviceType?: string;
    encryptedVaultKey: EncryptedPayload;
  }) => apiClient.post<TrustedDeviceResponse>("/api/trusted-devices", payload),
  rename: (id: string, payload: { deviceName: string }) =>
    apiClient.patch<TrustedDeviceResponse>(`/api/trusted-devices/${id}`, payload),
  touch: (payload: { deviceId: string }) =>
    apiClient.post<{ updated: boolean; state: "active" | "revoked" | "not_registered" }>(
      "/api/trusted-devices/touch",
      payload
    ),
  deviceState: (deviceId: string) =>
    apiClient.get<{ state: "active" | "revoked" | "not_registered" }>(
      `/api/trusted-devices/status?deviceId=${encodeURIComponent(deviceId)}`
    ),
  revoke: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/trusted-devices/${id}`),
};
