import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

export type PasskeyLoginVerifyResult = {
  loginToken: string;
  userId: string;
  credentialId: string;
  requiresTwoFactor?: boolean;
};

export type PasskeyVaultUnlockMetadata = {
  vaultUnlockAvailable: boolean;
  encryptedVaultKey: EncryptedPayload | null;
  prfRequired: boolean;
};

export const passkeyLoginApi = {
  options: (payload?: { email?: string; userId?: string; credentialId?: string }) =>
    apiClient.post<{ options: PublicKeyCredentialRequestOptionsJSON; prfIncluded: boolean }>(
      "/api/auth/passkey/login/options",
      payload ?? {}
    ),
  verify: (payload: { response: unknown }) =>
    apiClient.post<PasskeyLoginVerifyResult>("/api/auth/passkey/login/verify", payload),
  vaultUnlockMetadata: (payload: { loginToken: string; credentialId: string }) =>
    apiClient.post<PasskeyVaultUnlockMetadata>(
      "/api/auth/passkey/login/vault-unlock/metadata",
      payload
    ),
  vaultUnlockOptions: (payload: { loginToken: string; credentialId: string }) =>
    apiClient.post<{
      options: PublicKeyCredentialRequestOptionsJSON;
      encryptedVaultKey: EncryptedPayload;
      prfRequired: boolean;
    }>("/api/auth/passkey/login/vault-unlock/options", payload),
};
