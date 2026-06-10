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
});
