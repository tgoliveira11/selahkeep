import { apiClient } from "./client";

export type TwoFactorStatus = {
  enabled: boolean;
  enabledAt: string | null;
  hasPendingSetup: boolean;
};

export type TwoFactorSetupStartResponse = {
  qrCodeDataUrl: string;
  manualSetupKey: string;
  otpauthUrl: string;
  issuer: string;
  accountLabel: string;
};

export type TwoFactorSetupVerifyResponse = {
  success: boolean;
  backupCodes: string[];
};

export const twoFactorApi = {
  status: () => apiClient.get<TwoFactorStatus>("/api/account/2fa/status"),
  startSetup: () => apiClient.post<TwoFactorSetupStartResponse>("/api/account/2fa/setup/start", {}),
  verifySetup: (payload: { code: string }) =>
    apiClient.post<TwoFactorSetupVerifyResponse>("/api/account/2fa/setup/verify", payload),
  disable: (payload: { code?: string; backupCode?: string }) =>
    apiClient.post<{ success: boolean }>("/api/account/2fa/disable", payload),
  regenerateBackupCodes: (payload: { code?: string; backupCode?: string }) =>
    apiClient.post<{ backupCodes: string[] }>("/api/account/2fa/backup-codes/regenerate", payload),
};

export const authLoginApi = {
  start: (payload: { email: string; password: string }) =>
    apiClient.post<
      | { requiresTwoFactor: false; loginToken: string }
      | { requiresTwoFactor: true; challengeToken: string }
    >("/api/auth/login/start", payload),
  verifyTwoFactor: (payload: {
    challengeToken: string;
    code?: string;
    backupCode?: string;
  }) => apiClient.post<{ loginToken: string }>("/api/auth/login/verify-2fa", payload),
  verifyOAuthTwoFactor: (payload: { code?: string; backupCode?: string }) =>
    apiClient.post<{ upgradeToken: string }>("/api/auth/login/verify-2fa-oauth", payload),
};
