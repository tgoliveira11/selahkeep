import { describe, it, expect } from "vitest";
import {
  getDeviceDisplayInfo,
  formatDeviceMetadataSubtitle,
} from "@/lib/device-display-info";

describe("getDeviceDisplayInfo", () => {
  it("parses Chrome on macOS desktop", () => {
    const info = getDeviceDisplayInfo(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "MacIntel"
    );
    expect(info.browser).toBe("Chrome");
    expect(info.platform).toBe("macOS");
    expect(info.deviceType).toBe("desktop");
    expect(info.defaultDeviceName).toBe("Chrome on macOS");
  });

  it("parses Safari on iPhone as mobile", () => {
    const info = getDeviceDisplayInfo(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    expect(info.browser).toBe("Safari");
    expect(info.platform).toBe("iOS");
    expect(info.deviceType).toBe("mobile");
    expect(info.defaultDeviceName).toContain("mobile");
  });

  it("formats metadata subtitle", () => {
    expect(
      formatDeviceMetadataSubtitle({
        browser: "Firefox",
        platform: "Linux",
        deviceType: "desktop",
      })
    ).toBe("Firefox · Linux · desktop");
  });

  it("parses Edge, Firefox, and iPad variants", () => {
    expect(
      getDeviceDisplayInfo(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
      ).browser
    ).toBe("Edge");
    expect(
      getDeviceDisplayInfo("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0")
        .browser
    ).toBe("Firefox");
    const ipad = getDeviceDisplayInfo(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    expect(ipad.platform).toBe("iPadOS");
    expect(ipad.deviceType).toBe("tablet");
    expect(ipad.defaultDeviceName).toContain("tablet");
  });

  it("parses Android mobile and ChromeOS", () => {
    const android = getDeviceDisplayInfo(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    );
    expect(android.platform).toBe("Android");
    expect(android.deviceType).toBe("mobile");
    expect(getDeviceDisplayInfo("Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36").platform).toBe(
      "ChromeOS"
    );
  });

  it("uses navigator platform hints and unknown fallbacks", () => {
    expect(getDeviceDisplayInfo("unknown-agent", "Win32").platform).toBe("Windows");
    expect(getDeviceDisplayInfo("unknown-agent", "MacIntel").platform).toBe("macOS");
    expect(getDeviceDisplayInfo("").browser).toBe("unknown");
    expect(formatDeviceMetadataSubtitle({})).toBe("Unknown device");
    expect(
      formatDeviceMetadataSubtitle({ browser: "Chrome", platform: "macOS", deviceType: "unknown" })
    ).toBe("Chrome · macOS");
  });
});
