export const TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE =
  "Unlocked using this device while offline. Device status will be verified again when you reconnect.";

export type TrustedDeviceUnlockVerification =
  | { status: "verified-online" }
  | { status: "allowed-offline"; message: string };

export function verifiedOnlineTrustedDeviceVerification(): TrustedDeviceUnlockVerification {
  return { status: "verified-online" };
}

export function offlineTrustedDeviceVerification(
  message: string = TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE
): TrustedDeviceUnlockVerification {
  return { status: "allowed-offline", message };
}

export function getTrustedDeviceOfflineNotice(
  verification: TrustedDeviceUnlockVerification | null | undefined
): string | null {
  return verification?.status === "allowed-offline" ? verification.message : null;
}

export type DeviceVaultUnlockResult = {
  vaultKey: CryptoKey;
  verification: TrustedDeviceUnlockVerification;
};
