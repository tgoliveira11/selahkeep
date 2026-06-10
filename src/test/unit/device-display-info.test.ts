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
});
