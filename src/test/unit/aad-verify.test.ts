import { describe, it, expect } from "vitest";
import { verifyPayloadAad, ClientAadMismatchError } from "@/lib/crypto-client/aad-verify";
import { encryptedPayload, USER_ID, LETTER_ID } from "@/test/helpers/fixtures";

describe("client AAD verification", () => {
  it("accepts matching bindings", () => {
    expect(() =>
      verifyPayloadAad(encryptedPayload("title"), {
        userId: USER_ID,
        resourceId: LETTER_ID,
        field: "title",
      })
    ).not.toThrow();
  });

  it("rejects field mismatch before decryption", () => {
    expect(() =>
      verifyPayloadAad(encryptedPayload("title"), {
        userId: USER_ID,
        resourceId: LETTER_ID,
        field: "body",
      })
    ).toThrow(ClientAadMismatchError);
  });

  it("rejects user and resource binding mismatches", () => {
    expect(() =>
      verifyPayloadAad(encryptedPayload("title"), {
        userId: "00000000-0000-0000-0000-000000000099",
        resourceId: LETTER_ID,
        field: "title",
      })
    ).toThrow(/user binding mismatch/);
    expect(() =>
      verifyPayloadAad(encryptedPayload("title"), {
        userId: USER_ID,
        resourceId: "00000000-0000-0000-0000-000000000099",
        field: "title",
      })
    ).toThrow(/resource binding mismatch/);
  });
});
