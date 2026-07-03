import { apiClient } from "@/lib/api-client/client";

type VaultUnlockPasskeyList = {
  passkeys: Array<{ credentialId: string; vaultUnlockEnabled: boolean }>;
};

/** When exactly one vault passkey is configured, return its credential id for ceremony scoping. */
export async function resolveSingleVaultUnlockCredentialId(): Promise<string | undefined> {
  const data = await apiClient.get<VaultUnlockPasskeyList>("/api/passkeys/vault-unlock");
  const enabled = data.passkeys.filter((passkey) => passkey.vaultUnlockEnabled);
  if (enabled.length !== 1) {
    return undefined;
  }
  return enabled[0]?.credentialId;
}

export function resolveSingleVaultUnlockCredentialIdFromList(
  passkeys: Array<{ credentialId: string; vaultUnlockEnabled: boolean }>
): string | undefined {
  const enabled = passkeys.filter((passkey) => passkey.vaultUnlockEnabled);
  if (enabled.length !== 1) {
    return undefined;
  }
  return enabled[0]?.credentialId;
}
