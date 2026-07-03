import { describe, it, expect } from "vitest";
import {
  coerceExtensionBytesToUint8Array,
  extractNormalizedPasskeyPrfOutput,
  prfBytesForAes256Import,
} from "@/lib/passkey/normalize-prf-output";
import { bytesToBase64Url } from "@/lib/crypto-client/encoding";

describe("normalize passkey PRF output", () => {
  it("coerces ArrayBuffer and TypedArray views", () => {
    const bytes = new Uint8Array(64).fill(7);
    bytes[32] = 99;
    expect(coerceExtensionBytesToUint8Array(bytes.buffer)).toEqual(bytes);
    expect(coerceExtensionBytesToUint8Array(bytes)).toEqual(bytes);

    const view = new Uint8Array(bytes.buffer, 4, 32);
    expect(coerceExtensionBytesToUint8Array(view)).toEqual(new Uint8Array(view));
  });

  it("coerces base64url strings and rejects short arrays", () => {
    const bytes = new Uint8Array(32).fill(9);
    expect(coerceExtensionBytesToUint8Array(bytesToBase64Url(bytes))).toEqual(bytes);
    expect(coerceExtensionBytesToUint8Array([1, 2, 3])).toBeNull();
    expect(
      extractNormalizedPasskeyPrfOutput({
        prf: { results: { first: "not-long-enough" } },
      })
    ).toBeNull();
  });

  it("rejects values without real byte length (vault-core undefined < 32 bug)", () => {
    expect(coerceExtensionBytesToUint8Array({})).toBeNull();
    expect(
      extractNormalizedPasskeyPrfOutput({
        prf: { results: { first: "short-string" } },
      })
    ).toBeNull();
  });

  it("normalizes PRF output to exactly 32 bytes for AES-256 import", () => {
    const prf = crypto.getRandomValues(new Uint8Array(64));
    const keyBytes = prfBytesForAes256Import(prf);
    expect(keyBytes.byteLength).toBe(32);
    expect(keyBytes).toEqual(prf.subarray(0, 32));
  });

  it("reads eval.first PRF results", () => {
    const bytes = new Uint8Array(32).fill(3);
    expect(
      extractNormalizedPasskeyPrfOutput({
        prf: { results: { first: bytes.buffer } },
      })
    ).toEqual(bytes);
  });

  it("reads evalByCredential PRF results", () => {
    const bytes = new Uint8Array(32).fill(5);
    expect(
      extractNormalizedPasskeyPrfOutput(
        {
          prf: {
            results: {
              "cred-a": { first: bytes.buffer },
            },
          },
        },
        "cred-a"
      )
    ).toEqual(bytes);
  });

  it("prefers per-credential PRF over results.first when credentialId is known", () => {
    const correct = new Uint8Array(32).fill(2);
    const wrong = new Uint8Array(32).fill(8);
    expect(
      extractNormalizedPasskeyPrfOutput(
        {
          prf: {
            results: {
              first: wrong.buffer,
              "cred-a": { first: correct.buffer },
            },
          },
        },
        "cred-a"
      )
    ).toEqual(correct);
  });

  it("imports AES-256 key from normalized 64-byte PRF output", async () => {
    const prf = crypto.getRandomValues(new Uint8Array(64));
    const key = await crypto.subtle.importKey(
      "raw",
      prfBytesForAes256Import(prf),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
  });
});
