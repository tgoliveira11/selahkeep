import { describe, it, expect } from "vitest";
import {
  assertPayloadAad,
  assertLetterCreateAad,
  assertLetterUpdateAad,
  assertVaultKeyAad,
  AadValidationError,
} from "@/server/policies/aad-validation";
import { encryptedPayload, USER_ID, LETTER_ID } from "@/test/helpers/fixtures";
import { createLetterInput } from "@/test/helpers/fixtures";

describe("AAD validation policy", () => {
  it("accepts matching userId, resourceId, and field", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("title"), {
        userId: USER_ID,
        resourceId: LETTER_ID,
        field: "title",
      })
    ).not.toThrow();
  });

  it("rejects mismatched userId", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("title"), {
        userId: "00000000-0000-0000-0000-000000000099",
        resourceId: LETTER_ID,
        field: "title",
      })
    ).toThrow(AadValidationError);
  });

  it("rejects mismatched resourceId", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("title"), {
        userId: USER_ID,
        resourceId: "00000000-0000-0000-0000-000000000099",
        field: "title",
      })
    ).toThrow(AadValidationError);
  });

  it("rejects mismatched field", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("title"), {
        userId: USER_ID,
        resourceId: LETTER_ID,
        field: "body",
      })
    ).toThrow(AadValidationError);
  });

  it("validates all letter create payloads together", () => {
    const input = createLetterInput();
    expect(() => assertLetterCreateAad(USER_ID, LETTER_ID, input)).not.toThrow();
  });

  it("rejects letter create when title AAD resourceId differs from letter id", () => {
    const input = createLetterInput();
    input.encryptedTitle.aad.resourceId = "00000000-0000-0000-0000-000000000099";
    expect(() => assertLetterCreateAad(USER_ID, LETTER_ID, input)).toThrow(AadValidationError);
  });

  it("validates letter update payloads against persisted letter id", () => {
    expect(() =>
      assertLetterUpdateAad(USER_ID, LETTER_ID, {
        encryptedBody: encryptedPayload("body"),
      })
    ).not.toThrow();
  });

  it("validates vault key AAD binds to user id", () => {
    expect(() =>
      assertVaultKeyAad(USER_ID, encryptedPayload("vault_key", USER_ID))
    ).not.toThrow();
    expect(() =>
      assertVaultKeyAad(USER_ID, encryptedPayload("vault_key", LETTER_ID))
    ).toThrow(AadValidationError);
  });
});
