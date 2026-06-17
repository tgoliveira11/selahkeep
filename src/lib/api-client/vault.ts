import { apiClient } from "./client";
import type { EncryptedPayload, KdfMetadata } from "@/lib/validation/encrypted-payload";

export interface VaultStatus {
  initialized: boolean;
  vaultVersion?: string;
  recoveryState: "Protected" | "Basic" | "At Risk";
  methods?: string[];
  trustedDeviceCount?: number;
  hasRecoveryCode?: boolean;
  hasRecoveryPhrase?: boolean;
  hasVaultPassword?: boolean;
  hasPasskey?: boolean;
  ltgSetupComplete?: boolean;
}

export const vaultApi = {
  setup: (payload: {
    vaultVersion: "vault-v2";
    encryptedVaultSettings: EncryptedPayload;
    encryptedVaultIndex: EncryptedPayload;
    envelopes: Array<{
      method: "password" | "recovery_phrase";
      encryptedVaultKey: EncryptedPayload;
      kdfMetadata: KdfMetadata;
      publicMetadata?: Record<string, unknown>;
    }>;
  }) => apiClient.post<{ id: string }>("/api/vault/setup", payload),

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

  unlockEnvelope: (method: "password" | "recovery_phrase" | "recovery_code") =>
    apiClient.post<{
      encryptedVaultKey: EncryptedPayload;
      kdfMetadata: KdfMetadata;
    }>("/api/vault/unlock-envelope", { method }),

  deviceEnvelopes: () =>
    apiClient.get<
      Array<{
        id: string;
        encryptedVaultKey: EncryptedPayload;
        createdAt: string;
      }>
    >("/api/vault/device-envelopes"),

  getIndex: () =>
    apiClient.get<{ encryptedVaultIndex: EncryptedPayload | null }>("/api/vault/index"),

  updateIndex: (encryptedVaultIndex: EncryptedPayload) =>
    apiClient.patch<{ encryptedVaultIndex: EncryptedPayload | null }>("/api/vault/index", {
      encryptedVaultIndex,
    }),
};
