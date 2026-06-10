export type DeviceFormFactor = "desktop" | "mobile" | "tablet" | "unknown";

export interface DeviceDisplayInfo {
  browser: string;
  platform: string;
  deviceType: DeviceFormFactor;
  defaultDeviceName: string;
}

function parseBrowser(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  return "unknown";
}

function parsePlatform(userAgent: string, navPlatform?: string): string {
  if (/iPhone|iPod/.test(userAgent)) return "iOS";
  if (/iPad/.test(userAgent)) return "iPadOS";
  if (/Android/.test(userAgent)) return "Android";
  if (/Mac OS X|Macintosh/.test(userAgent)) return "macOS";
  if (/Windows/.test(userAgent)) return "Windows";
  if (/CrOS/.test(userAgent)) return "ChromeOS";
  if (/Linux/.test(userAgent)) return "Linux";
  if (navPlatform === "Win32") return "Windows";
  if (navPlatform === "MacIntel") return "macOS";
  return navPlatform ?? "unknown";
}

function parseFormFactor(userAgent: string): DeviceFormFactor {
  if (/iPad|Tablet|Android(?!.*Mobile)/.test(userAgent)) return "tablet";
  if (/Mobile|iPhone|iPod|Android.*Mobile/.test(userAgent)) return "mobile";
  return "desktop";
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

  const browser = parseBrowser(ua);
  const platform = parsePlatform(ua, platformHint);
  const deviceType = parseFormFactor(ua);
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
