import { describe, it, expect, afterEach, vi } from "vitest";
import { currentDeviceLabel } from "@/lib/passkey/device-label";

function stubNavigator(userAgent: string, platform = "") {
  vi.stubGlobal("navigator", { userAgent, platform } as Navigator);
}

describe("currentDeviceLabel", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("labels macOS + Chrome", () => {
    stubNavigator(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    );
    expect(currentDeviceLabel()).toBe("macOS · Chrome");
  });

  it("labels iPhone + Safari", () => {
    stubNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    );
    expect(currentDeviceLabel()).toBe("iPhone · Safari");
  });

  it("falls back when unknown", () => {
    stubNavigator("something weird", "");
    expect(currentDeviceLabel()).toBe("This device");
  });
});
