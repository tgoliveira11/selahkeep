import { apiClient } from "./client";

export type AccountAuthStatus = {
  email: string;
  authProvider: string;
  hasPassword: boolean;
  emailVerified: boolean;
  canChangePassword: boolean;
};

export const accountAuthApi = {
  getStatus: () => apiClient.get<AccountAuthStatus>("/api/account/auth-status"),
  resendVerification: (payload?: { email?: string }) =>
    apiClient.post<{ message: string }>("/api/auth/verify-email/resend", payload ?? {}),
  confirmVerification: (token: string) =>
    apiClient.post<{ verified: boolean; email: string }>("/api/auth/verify-email/confirm", {
      token,
    }),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>("/api/auth/forgot-password", { email }),
  validateResetToken: (token: string) =>
    apiClient.post<{ valid: boolean }>("/api/auth/reset-password", {
      action: "validate",
      token,
    }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<{ success: boolean }>("/api/auth/reset-password", {
      action: "reset",
      token,
      newPassword,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<{ success: boolean }>("/api/account/change-password", {
      currentPassword,
      newPassword,
    }),
};
