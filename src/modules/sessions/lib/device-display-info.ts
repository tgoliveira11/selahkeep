import {
  parseUserAgentMetadata,
  type DeviceFormFactor,
} from "@/lib/user-agent-metadata";

export type { DeviceFormFactor };

export interface DeviceDisplayInfo {
  browser: string;
  platform: string;
  deviceType: DeviceFormFactor;
  defaultDeviceName: string;
}

function buildDefaultDeviceName(
  browser: string,
  platform: string,
  deviceType: DeviceFormFactor
): string {
  if (deviceType === "mobile" || deviceType === "tablet") {
    return `${browser} on ${platform} (${deviceType})`;
  }
  return `${browser} on ${platform}`;
}

/** Parses browser, OS, and form factor for trusted-device labels (client-only). */
export function getDeviceDisplayInfo(
  userAgent?: string,
  navPlatform?: string
): DeviceDisplayInfo {
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const platformHint =
    navPlatform ??
    (typeof navigator !== "undefined" ? navigator.platform : undefined);

  const { browser, platform, deviceType } = parseUserAgentMetadata(ua, platformHint);
  const defaultDeviceName = buildDefaultDeviceName(browser, platform, deviceType);

  return { browser, platform, deviceType, defaultDeviceName };
}

export function formatDeviceMetadataSubtitle(device: {
  browser?: string | null;
  platform?: string | null;
  deviceType?: string | null;
}): string {
  const parts = [
    device.browser,
    device.platform,
    device.deviceType && device.deviceType !== "unknown" ? device.deviceType : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Unknown device";
}
