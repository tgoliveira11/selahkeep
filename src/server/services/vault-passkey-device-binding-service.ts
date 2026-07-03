import type { DbClient } from "@/lib/db";
import { passkeyRepository } from "@/server/repositories/passkey-repository";
import { vaultPasskeyDeviceBindingRepository } from "@/server/repositories/vault-passkey-device-binding-repository";
import { vaultRepository } from "@/server/repositories/vault-repository";

/** True when the HttpOnly cookie binding matches an active vault passkey credential + envelope. */
export async function resolvePasskeyUnlockAvailableOnThisDevice(
  userId: string,
  deviceBindingId?: string
): Promise<boolean> {
  if (!deviceBindingId) return false;

  const binding = await vaultPasskeyDeviceBindingRepository.findByIdForUser(
    deviceBindingId,
    userId
  );
  if (!binding) return false;

  const credential = await passkeyRepository.findByIdForUser(binding.passkeyCredentialId, userId);
  if (!credential?.vaultUnlockEnabled) return false;

  const envelope = await vaultRepository.findActivePasskeyEnvelopeByCredentialId(
    userId,
    credential.credentialId
  );

  return Boolean(envelope);
}

export async function bindVaultPasskeyToThisDevice(
  userId: string,
  passkeyCredentialDbId: string,
  options: { deviceLabel?: string | null; existingBindingId?: string },
  client?: DbClient
): Promise<{ bindingId: string }> {
  return vaultPasskeyDeviceBindingRepository.bindPasskeyToDevice(
    userId,
    passkeyCredentialDbId,
    options,
    client
  );
}

export async function touchVaultPasskeyDeviceBindingLastUsed(
  userId: string,
  deviceBindingId: string
): Promise<void> {
  await vaultPasskeyDeviceBindingRepository.touchLastUsedAt(deviceBindingId, userId);
}
