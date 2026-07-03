/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  detectPasskeyPrfSupport,
  isAppleMobileBelowPrfMinimum,
  isPrfExtensionSupported,
  parseAppleMobileOsMajorVersion,
} from "@/lib/passkey/prf-support";

const IPHONE_16_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.7 Mobile/15E148 Safari/604.1";
const IPHONE_18_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1";

describe("parseAppleMobileOsMajorVersion", () => {
  it("parses iPhone OS major version", () => {
    expect(parseAppleMobileOsMajorVersion(IPHONE_16_UA)).toBe(16);
    expect(parseAppleMobileOsMajorVersion(IPHONE_18_UA)).toBe(18);
  });
});

describe("isAppleMobileBelowPrfMinimum", () => {
  it("is true on iOS versions before 18", () => {
    expect(isAppleMobileBelowPrfMinimum(IPHONE_16_UA)).toBe(true);
  });

  it("is false on iOS 18 and later", () => {
    expect(isAppleMobileBelowPrfMinimum(IPHONE_18_UA)).toBe(false);
  });

  it("is false on desktop Chrome", () => {
    expect(
      isAppleMobileBelowPrfMinimum(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });
});

describe("detectPasskeyPrfSupport", () => {
  const originalPublicKeyCredential = globalThis.PublicKeyCredential;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.PublicKeyCredential = originalPublicKeyCredential;
  });

  it("returns unsupported when WebAuthn is unavailable", async () => {
    // @ts-expect-error test stub
    globalThis.PublicKeyCredential = undefined;
    await expect(detectPasskeyPrfSupport()).resolves.toBe("unsupported");
  });

  it("returns supported when client capabilities report PRF", async () => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      getClientCapabilities: async () => ({ "extension:prf": true }),
    } as unknown as typeof PublicKeyCredential;

    await expect(detectPasskeyPrfSupport()).resolves.toBe("supported");
  });

  it("returns unknown when client capabilities explicitly deny PRF", async () => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      getClientCapabilities: async () => ({ "extension:prf": false }),
    } as unknown as typeof PublicKeyCredential;

    await expect(detectPasskeyPrfSupport()).resolves.toBe("unknown");
  });

  it("isPrfExtensionSupported is optimistic when WebAuthn exposes extension results", () => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      prototype: { getClientExtensionResults: () => ({}) },
    } as unknown as typeof PublicKeyCredential;

    expect(isPrfExtensionSupported()).toBe(true);
  });

  it("isPrfExtensionSupported is false on iPhone iOS versions before 18", () => {
    vi.stubGlobal("navigator", { userAgent: IPHONE_16_UA });
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      prototype: { getClientExtensionResults: () => ({}) },
    } as unknown as typeof PublicKeyCredential;

    expect(isPrfExtensionSupported()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("isPrfExtensionSupported is false without WebAuthn", () => {
    // @ts-expect-error test stub
    globalThis.PublicKeyCredential = undefined;
    expect(isPrfExtensionSupported()).toBe(false);
  });

  it("returns unknown when capability probe is unavailable", async () => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
    } as unknown as typeof PublicKeyCredential;

    await expect(detectPasskeyPrfSupport()).resolves.toBe("unknown");
  });

  it("returns unknown when capability probe throws", async () => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      getClientCapabilities: async () => {
        throw new Error("probe failed");
      },
    } as unknown as typeof PublicKeyCredential;

    await expect(detectPasskeyPrfSupport()).resolves.toBe("unknown");
  });

  it("returns unknown when PRF capability is not reported", async () => {
    globalThis.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
      getClientCapabilities: async () => ({}),
    } as unknown as typeof PublicKeyCredential;

    await expect(detectPasskeyPrfSupport()).resolves.toBe("unknown");
  });
});
