import { apiClient } from "./client";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import type { PasskeyCapabilityLabel } from "@/lib/passkey/credential-label";

export type AccountPasskey = {
  id: string;
  friendlyName: string;
  createdAt: string;
  lastUsedAt: string | null;
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
  prfSupported: boolean | null;
  capability: PasskeyCapabilityLabel;
  capabilityLabel: string;
};

export const passkeyAccountApi = {
  list: () => apiClient.get<{ passkeys: AccountPasskey[] }>("/api/account/passkeys"),
  registerOptions: () =>
    apiClient.post<PublicKeyCredentialCreationOptionsJSON>("/api/account/passkeys/register", {
      action: "options",
    }),
  registerVerify: (payload: {
    response: unknown;
    friendlyName?: string;
    encryptedVaultKey?: EncryptedPayload;
    prfVaultEnvelope?: true;
    prfSupported?: boolean | null;
  }) =>
    apiClient.post<{ verified: boolean; credentialId: string; vaultUnlockEnabled: boolean }>(
      "/api/account/passkeys/register",
      { action: "verify", ...payload }
    ),
  enableVaultUnlockOptions: (id: string) =>
    apiClient.post<PublicKeyCredentialRequestOptionsJSON>(
      `/api/account/passkeys/${id}/enable-vault-unlock`,
      { action: "options" }
    ),
  enableVaultUnlockVerify: (
    id: string,
    payload: {
      response: unknown;
      encryptedVaultKey: EncryptedPayload;
      prfVaultEnvelope: true;
      prfSupported?: boolean | null;
    }
  ) =>
    apiClient.post<{ success: boolean }>(
      `/api/account/passkeys/${id}/enable-vault-unlock`,
      { action: "verify", ...payload }
    ),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/account/passkeys/${id}`),
};
