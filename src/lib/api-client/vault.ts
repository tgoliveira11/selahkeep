import { apiClient } from "./client";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";

export interface VaultStatus {
  initialized: boolean;
  vaultVersion?: string;
  recoveryState: "Protected" | "Basic" | "At Risk";
  methods?: string[];
  trustedDeviceCount?: number;
  hasRecoveryCode?: boolean;
  hasPasskey?: boolean;
}

export const vaultApi = {
  init: (payload: {
    vaultVersion: string;
    envelopes: Array<{
      method: string;
      encryptedVaultKey: EncryptedPayload;
      kdfMetadata?: KdfMetadata;
      publicMetadata?: Record<string, unknown>;
      trustedDevice?: {
        deviceName: string;
        devicePublicKey?: Record<string, unknown>;
        browser?: string;
        platform?: string;
        deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
      };
    }>;
  }) => apiClient.post<{ id: string }>("/api/vault/init", payload),

  status: () => apiClient.get<VaultStatus>("/api/vault/status"),

  storeRecoveryCode: (payload: {
    encryptedVaultKey: EncryptedPayload;
    kdfMetadata: KdfMetadata;
  }) => apiClient.post<{ id: string }>("/api/recovery-code", payload),

  unlockWithRecoveryCode: () =>
    apiClient.post<{
      encryptedVaultKey: EncryptedPayload;
      kdfMetadata: KdfMetadata;
    }>("/api/vault/unlock-with-recovery-code", {}),

  deviceEnvelopes: () =>
    apiClient.get<
      Array<{
        id: string;
        encryptedVaultKey: EncryptedPayload;
        createdAt: string;
      }>
    >("/api/vault/device-envelopes"),
};
