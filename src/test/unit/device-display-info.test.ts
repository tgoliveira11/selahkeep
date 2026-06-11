import { describe, it, expect } from "vitest";
import {
  formatDeviceMetadataSubtitle,
  getDeviceDisplayInfo,
} from "@/lib/device-display-info";

describe("device display info", () => {
  it("builds default device names from user agent", () => {
    const info = getDeviceDisplayInfo(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    expect(info.defaultDeviceName).toContain("Chrome");
    expect(info.defaultDeviceName).toContain("macOS");
  });

  it("formats metadata subtitles and handles empty metadata", () => {
    expect(
      formatDeviceMetadataSubtitle({
        browser: "Chrome",
        platform: "macOS",
        deviceType: "desktop",
      })
    ).toContain("Chrome");
    expect(formatDeviceMetadataSubtitle({})).toBe("Unknown device");
    expect(formatDeviceMetadataSubtitle({ browser: "Chrome", deviceType: "unknown" })).toBe(
      "Chrome"
    );
  });
});
