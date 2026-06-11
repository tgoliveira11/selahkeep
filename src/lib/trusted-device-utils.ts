import type { TrustedDeviceResponse } from "@/lib/api-client/trusted-devices";
import type { DeviceDisplayInfo } from "@/lib/device-display-info";

export function getTrustedDeviceClientId(
  device: Pick<TrustedDeviceResponse, "devicePublicKey" | "clientDeviceId">
): string | null {
  if (typeof device.clientDeviceId === "string" && device.clientDeviceId.length > 0) {
    return device.clientDeviceId;
  }

  const deviceId = device.devicePublicKey?.deviceId;
  return typeof deviceId === "string" ? deviceId : null;
}

export function isActiveTrustedDevice(
  device: Pick<TrustedDeviceResponse, "revokedAt">
): boolean {
  return !device.revokedAt;
}

export function isCurrentTrustedDevice(
  device: Pick<TrustedDeviceResponse, "devicePublicKey" | "revokedAt">,
  currentDeviceId: string | null
): boolean {
  if (!currentDeviceId || !isActiveTrustedDevice(device)) return false;
  return getTrustedDeviceClientId(device) === currentDeviceId;
}

export function isDeviceAlreadyRegistered(
  devices: TrustedDeviceResponse[],
  currentDeviceId: string | null
): boolean {
  if (!currentDeviceId) return false;
  return devices.some((device) => isCurrentTrustedDevice(device, currentDeviceId));
}

export function findActiveDeviceWithMatchingMetadata(
  devices: TrustedDeviceResponse[],
  displayInfo: Pick<DeviceDisplayInfo, "browser" | "platform" | "deviceType">
): TrustedDeviceResponse | null {
  const matches = findActiveDevicesWithMatchingMetadata(devices, displayInfo);
  return matches.length === 1 ? matches[0] : null;
}

export function findActiveDevicesWithMatchingMetadata(
  devices: TrustedDeviceResponse[],
  displayInfo: Pick<DeviceDisplayInfo, "browser" | "platform" | "deviceType">
): TrustedDeviceResponse[] {
  return devices.filter(
    (device) =>
      isActiveTrustedDevice(device) &&
      device.browser === displayInfo.browser &&
      device.platform === displayInfo.platform &&
      (device.deviceType ?? "unknown") === displayInfo.deviceType
  );
}
