import { createHash } from "node:crypto";

export type DeviceFormFactor = "desktop" | "mobile" | "tablet" | "unknown";

export interface UserAgentMetadata {
  browser: string;
  platform: string;
  deviceType: DeviceFormFactor;
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

export function parseUserAgentMetadata(
  userAgent?: string | null,
  navPlatform?: string | null
): UserAgentMetadata {
  const ua = userAgent?.trim() ?? "";
  if (!ua) {
    return { browser: "unknown", platform: "unknown", deviceType: "unknown" };
  }
  return {
    browser: parseBrowser(ua),
    platform: parsePlatform(ua, navPlatform ?? undefined),
    deviceType: parseFormFactor(ua),
  };
}

export function hashUserAgent(userAgent: string): string {
  const pepper = process.env.NEXTAUTH_SECRET;
  if (!pepper) {
    throw new Error("NEXTAUTH_SECRET is not configured");
  }
  return createHash("sha256").update(`${pepper}:user-agent:${userAgent}`).digest("hex");
}
