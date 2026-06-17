import { describe, it, expect } from "vitest";
import {
  assertPayloadAad,
  assertNoteCreateAad,
  assertNoteUpdateAad,
  assertVaultKeyAad,
  AadValidationError,
} from "@/server/policies/aad-validation";
import { encryptedPayload, USER_ID, NOTE_ID } from "@/test/helpers/fixtures";
import { createNoteInput } from "@/test/helpers/fixtures";

describe("AAD validation policy", () => {
  it("accepts matching userId, resourceId, and field", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("note_metadata", NOTE_ID), {
        userId: USER_ID,
        resourceId: NOTE_ID,
        field: "note_metadata",
      })
    ).not.toThrow();
  });

  it("rejects mismatched userId", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("note_metadata", NOTE_ID), {
        userId: "00000000-0000-0000-0000-000000000099",
        resourceId: NOTE_ID,
        field: "note_metadata",
      })
    ).toThrow(AadValidationError);
  });

  it("rejects mismatched resourceId", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("note_metadata", NOTE_ID), {
        userId: USER_ID,
        resourceId: "00000000-0000-0000-0000-000000000099",
        field: "note_metadata",
      })
    ).toThrow(AadValidationError);
  });

  it("rejects mismatched field", () => {
    expect(() =>
      assertPayloadAad(encryptedPayload("note_metadata", NOTE_ID), {
        userId: USER_ID,
        resourceId: NOTE_ID,
        field: "note_body",
      })
    ).toThrow(AadValidationError);
  });

  it("validates all note create payloads together", () => {
    const input = createNoteInput();
    expect(() => assertNoteCreateAad(USER_ID, NOTE_ID, input)).not.toThrow();
  });

  it("rejects note create when metadata AAD resourceId differs from note id", () => {
    const input = createNoteInput();
    input.encryptedMetadata.aad.resourceId = "00000000-0000-0000-0000-000000000099";
    expect(() => assertNoteCreateAad(USER_ID, NOTE_ID, input)).toThrow(AadValidationError);
  });

  it("validates note update payloads against persisted note id", () => {
    expect(() =>
      assertNoteUpdateAad(USER_ID, NOTE_ID, {
        encryptedBody: encryptedPayload("note_body", NOTE_ID),
      })
    ).not.toThrow();
  });

  it("validates vault key AAD binds to user id", () => {
    expect(() =>
      assertVaultKeyAad(USER_ID, encryptedPayload("vault_key", USER_ID))
    ).not.toThrow();
    expect(() =>
      assertVaultKeyAad(USER_ID, encryptedPayload("vault_key", NOTE_ID))
    ).toThrow(AadValidationError);
  });
});
