import { describe, it, expect } from "vitest";
import { extractPasskeyPrfOutput } from "@tgoliveira/vault-core";
import { bytesToBase64Url } from "@/lib/crypto-client/encoding";

describe("extractPasskeyPrfOutput (vault-core)", () => {
  const prfBytes = new Uint8Array(32).map((_, index) => index);

  it("reads eval.results.first as ArrayBuffer", () => {
    const output = extractPasskeyPrfOutput({
      prf: { results: { first: prfBytes.buffer } },
    });
    expect(output).toEqual(prfBytes);
  });

  it("prefers evalByCredential entry for the ceremony credential", () => {
    const other = new Uint8Array(32).fill(9);
    const output = extractPasskeyPrfOutput(
      {
        prf: {
          results: { first: other },
          evalByCredential: {
            "vault-cred": { first: prfBytes },
          },
        },
      },
      { credentialId: "vault-cred" }
    );
    expect(output).toEqual(prfBytes);
  });

  it("coerces base64url PRF bytes", () => {
    const encoded = bytesToBase64Url(prfBytes);
    const output = extractPasskeyPrfOutput({
      prf: { results: { first: encoded } },
    });
    expect(output).toEqual(prfBytes);
  });

  it("returns null when PRF output is too short", () => {
    const output = extractPasskeyPrfOutput({
      prf: { results: { first: new Uint8Array(16) } },
    });
    expect(output).toBeNull();
  });
});
