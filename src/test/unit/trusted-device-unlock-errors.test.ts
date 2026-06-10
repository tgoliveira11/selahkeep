import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api-client/api-error";
import {
  classifyTrustedDeviceApiError,
  getTrustedDeviceUnlockErrorMessage,
  isNetworkUnavailableError,
  RevokedTrustedDeviceError,
  TrustedDeviceNetworkUnavailableError,
  UnauthenticatedTrustedDeviceError,
} from "@/lib/crypto-client/trusted-device-unlock-errors";

describe("trusted device unlock errors", () => {
  it("detects network unavailable errors", () => {
    expect(isNetworkUnavailableError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkUnavailableError(new DOMException("network", "NetworkError"))).toBe(true);
    expect(isNetworkUnavailableError(new Error("Load failed"))).toBe(true);
    expect(isNetworkUnavailableError(new ApiError(500, "fail"))).toBe(false);
  });

  it("classifies HTTP status codes", () => {
    expect(() => classifyTrustedDeviceApiError(new ApiError(401, "Unauthorized"))).toThrow(
      UnauthenticatedTrustedDeviceError
    );
    expect(() => classifyTrustedDeviceApiError(new ApiError(403, "Forbidden"))).toThrow();
    expect(() => classifyTrustedDeviceApiError(new ApiError(404, "Not found"))).toThrow();
    expect(() => classifyTrustedDeviceApiError(new ApiError(500, "Server error"))).toThrow();
    expect(() => classifyTrustedDeviceApiError(new ApiError(418, "Teapot"))).toThrow();
    expect(() => classifyTrustedDeviceApiError(new TypeError("Failed to fetch"))).toThrow(
      TrustedDeviceNetworkUnavailableError
    );
  });

  it("returns safe user messages", () => {
    expect(getTrustedDeviceUnlockErrorMessage(new RevokedTrustedDeviceError())).toContain(
      "revoked"
    );
    expect(getTrustedDeviceUnlockErrorMessage("unknown")).toBe(
      "Could not unlock your vault on this device."
    );
  });
});
