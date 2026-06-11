export type AccountAuthMethod = "password" | "google" | "apple" | "passkey" | "unknown";

export type AccountSessionView = {
  id: string;
  isCurrent: boolean;
  authMethod: AccountAuthMethod;
  browser: string;
  platform: string;
  deviceType: string;
  ipMasked: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};
