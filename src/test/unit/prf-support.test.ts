/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectPasskeyPrfSupport, isPrfExtensionSupported } from "@/lib/passkey/prf-support";

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
