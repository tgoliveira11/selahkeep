import { apiClient } from "@/lib/api-client/client";

type VaultUnlockPasskeyList = {
  passkeys: Array<{ credentialId: string; vaultUnlockEnabled: boolean }>;
  currentDeviceCredentialId?: string | null;
  activeEnvelopeCredentialId?: string | null;
};

/** Resolve the credential id for vault unlock ceremonies (device binding wins over heuristics). */
export async function resolveActiveVaultUnlockCredentialId(): Promise<string | undefined> {
  const data = await apiClient.get<VaultUnlockPasskeyList>("/api/passkeys/vault-unlock");
  return resolveActiveVaultUnlockCredentialIdFromList(data);
}

/** @deprecated Use {@link resolveActiveVaultUnlockCredentialId}. */
export const resolveSingleVaultUnlockCredentialId = resolveActiveVaultUnlockCredentialId;

export function resolveActiveVaultUnlockCredentialIdFromList(
  list: VaultUnlockPasskeyList
): string | undefined {
  if (list.currentDeviceCredentialId) {
    return list.currentDeviceCredentialId;
  }

  if (list.activeEnvelopeCredentialId) {
    return list.activeEnvelopeCredentialId;
  }

  const enabled = list.passkeys.filter((passkey) => passkey.vaultUnlockEnabled);
  if (enabled.length === 1) {
    return enabled[0]?.credentialId;
  }

  if (list.passkeys.length === 1) {
    return list.passkeys[0]?.credentialId;
  }

  return undefined;
}

/** @deprecated Use {@link resolveActiveVaultUnlockCredentialIdFromList}. */
export function resolveSingleVaultUnlockCredentialIdFromList(
  passkeys: Array<{ credentialId: string; vaultUnlockEnabled: boolean }>
): string | undefined {
  return resolveActiveVaultUnlockCredentialIdFromList({ passkeys });
}
