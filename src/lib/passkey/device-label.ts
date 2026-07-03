/**
 * Short, human-friendly label for the current device, used to name a vault passkey
 * so the user can tell which passkey belongs to which device when unlocking.
 * Best-effort only (never trusted for security); the server bounds the length.
 */
export function currentDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";

  const ua = navigator.userAgent || "";
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    "";

  const os = detectOs(ua, platform);
  const browser = detectBrowser(ua);
  return browser ? `${os} · ${browser}` : os;
}

function detectOs(ua: string, platform: string): string {
  const haystack = `${ua} ${platform}`;
  if (/iPhone/i.test(haystack)) return "iPhone";
  if (/iPad/i.test(haystack)) return "iPad";
  if (/Android/i.test(haystack)) return "Android";
  if (/Mac/i.test(haystack)) return "macOS";
  if (/Win/i.test(haystack)) return "Windows";
  if (/Linux|X11/i.test(haystack)) return "Linux";
  return "This device";
}

function detectBrowser(ua: string): string | null {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return null;
}
