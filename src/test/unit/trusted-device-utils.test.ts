import { describe, it, expect } from "vitest";
import {
  getTrustedDeviceClientId,
  isCurrentTrustedDevice,
  isDeviceAlreadyRegistered,
} from "@/lib/trusted-device-utils";
import type { TrustedDeviceResponse } from "@/lib/api-client/trusted-devices";

const baseDevice: TrustedDeviceResponse = {
  id: "server-1",
  userId: "user-1",
  deviceName: "Chrome on macOS",
  devicePublicKey: { deviceId: "client-device-1" },
  browser: "Chrome",
  platform: "macOS",
  deviceType: "desktop",
  createdAt: new Date().toISOString(),
  lastUsedAt: null,
  revokedAt: null,
};

describe("trusted device utils", () => {
  it("reads client device id from devicePublicKey", () => {
    expect(getTrustedDeviceClientId(baseDevice)).toBe("client-device-1");
  });

  it("detects current active device", () => {
    expect(isCurrentTrustedDevice(baseDevice, "client-device-1")).toBe(true);
    expect(isCurrentTrustedDevice(baseDevice, "other-id")).toBe(false);
  });

  it("ignores revoked devices for current-device checks", () => {
    expect(
      isCurrentTrustedDevice({ ...baseDevice, revokedAt: new Date().toISOString() }, "client-device-1")
    ).toBe(false);
  });

  it("detects when current browser is already registered", () => {
    expect(isDeviceAlreadyRegistered([baseDevice], "client-device-1")).toBe(true);
    expect(isDeviceAlreadyRegistered([baseDevice], "other-id")).toBe(false);
  });
});
