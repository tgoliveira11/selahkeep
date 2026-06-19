import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiClient } from "@/lib/api-client/client";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
import { PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE } from "@/lib/passkey/messages";
import { logVaultUnlockAuthDiagnostic } from "@/lib/passkey/vault-unlock-auth-diagnostics";

/** Purpose sent to POST /api/passkeys/authenticate for vault PRF unlock only. */
export const VAULT_UNLOCK_AUTHENTICATE_PURPOSE = "vault_unlock" as const;

export type VaultUnlockAuthenticatePurpose = typeof VAULT_UNLOCK_AUTHENTICATE_PURPOSE;

export function filterAuthenticationOptionsForCredential(
  options: PublicKeyCredentialRequestOptionsJSON,
  credentialId?: string
): PublicKeyCredentialRequestOptionsJSON {
  if (!credentialId) {
    return options;
  }

  const matchingCredential = options.allowCredentials?.find(
    (credential) => credential.id === credentialId
  );

  if (!matchingCredential) {
    throw new Error(PASSKEY_NOT_AVAILABLE_FOR_VAULT_UNLOCK_MESSAGE);
  }

  return {
    ...options,
    allowCredentials: [matchingCredential],
  };
}

export async function requestVaultUnlockAuthenticationOptions(
  credentialId?: string
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = (await apiClient.post("/api/passkeys/authenticate", {
    action: "options",
    purpose: VAULT_UNLOCK_AUTHENTICATE_PURPOSE,
  })) as PublicKeyCredentialRequestOptionsJSON;

  const filtered = filterAuthenticationOptionsForCredential(options, credentialId);
  logVaultUnlockAuthDiagnostic(filtered);
  return filtered;
}

export async function runVaultUnlockAuthenticationCeremony(
  credentialId?: string
): Promise<Awaited<ReturnType<typeof startAuthentication>>> {
  const options = await requestVaultUnlockAuthenticationOptions(credentialId);
  return startAuthentication({
    optionsJSON: prepareAuthenticationOptions(options),
  });
}

export async function verifyVaultUnlockAuthentication(
  response: Awaited<ReturnType<typeof startAuthentication>>
) {
  return apiClient.post("/api/passkeys/authenticate", {
    action: "verify",
    purpose: VAULT_UNLOCK_AUTHENTICATE_PURPOSE,
    response,
  });
}
