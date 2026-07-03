import { describe, it, expect } from "vitest";
import {
  prepareAuthenticationOptions,
  prepareRegistrationOptions,
  prepareWebAuthnExtensions,
} from "@/lib/passkey/prepare-webauthn-options";
import { passkeyPrfSaltBase64Url } from "@/lib/passkey/prf";
import { bytesToBase64Url } from "@/lib/crypto-client/encoding";

describe("prepareWebAuthnExtensions", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  it("converts PRF eval.first from base64url to ArrayBuffer", () => {
    const salt = passkeyPrfSaltBase64Url(userId);
    const prepared = prepareRegistrationOptions({
      challenge: "abc",
      extensions: {
        prf: {
          eval: { first: salt },
        },
      },
    });

    const first = prepared.extensions?.prf?.eval?.first;
    expect(first).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(first as ArrayBuffer)).toHaveLength(32);
  });

  it("converts PRF eval.second from base64url to ArrayBuffer", () => {
    const second = bytesToBase64Url(new Uint8Array(32).fill(4));
    const prepared = prepareRegistrationOptions({
      challenge: "abc",
      extensions: {
        prf: {
          eval: { second },
        },
      },
    });

    expect(prepared.extensions?.prf?.eval?.second).toBeInstanceOf(ArrayBuffer);
  });

  it("converts PRF evalByCredential salts", () => {
    const salt = passkeyPrfSaltBase64Url(userId);
    const prepared = prepareWebAuthnExtensions({
      prf: {
        evalByCredential: {
          "cred-id": { first: salt },
        },
      },
    });

    const converted = prepared?.prf?.evalByCredential?.["cred-id"]?.first;
    expect(converted).toBeInstanceOf(ArrayBuffer);
  });

  it("preserves ArrayBuffer values", () => {
    const buffer = new Uint8Array(32).fill(8).buffer;
    const prepared = prepareWebAuthnExtensions({
      prf: { eval: { first: buffer } },
    });
    expect(prepared?.prf?.eval?.first).toBe(buffer);
  });

  it("leaves options without extensions unchanged", () => {
    const options = { challenge: "abc" };
    expect(prepareRegistrationOptions(options)).toEqual(options);
  });

  it("prepareAuthenticationOptions converts PRF extensions", () => {
    const salt = passkeyPrfSaltBase64Url(userId);
    const prepared = prepareAuthenticationOptions({
      challenge: "abc",
      extensions: { prf: { eval: { first: salt } } },
    });
    expect(prepared.extensions?.prf?.eval?.first).toBeInstanceOf(ArrayBuffer);
  });
});
