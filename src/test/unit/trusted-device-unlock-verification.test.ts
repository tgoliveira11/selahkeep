import { describe, it, expect } from "vitest";
import {
  TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE,
  getTrustedDeviceOfflineNotice,
  offlineTrustedDeviceVerification,
  verifiedOnlineTrustedDeviceVerification,
} from "@/lib/crypto-client/trusted-device-unlock-verification";

describe("trusted device unlock verification", () => {
  it("returns null offline notice for verified-online status", () => {
    expect(getTrustedDeviceOfflineNotice(verifiedOnlineTrustedDeviceVerification())).toBeNull();
  });

  it("returns offline message for allowed-offline status", () => {
    const verification = offlineTrustedDeviceVerification();
    expect(verification.status).toBe("allowed-offline");
    expect(getTrustedDeviceOfflineNotice(verification)).toBe(
      TRUSTED_DEVICE_OFFLINE_UNLOCK_MESSAGE
    );
  });
});
