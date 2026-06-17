import { describe, it, expect } from "vitest";
import { rejectPlaintextNoteFields } from "@/lib/validation/notes";
import { assertNoPlaintextNoteFields, PlaintextRejectionError } from "@/modules/security/policies/note-plaintext-rejection";

describe("notes plaintext rejection", () => {
  it("rejects forbidden plaintext fields", () => {
    const fields = ["title", "body", "markdown", "tags", "categoryId", "categoryName", "tagNames", "answered", "noteKey", "metadata"] as const;
    for (const field of fields) {
      expect(rejectPlaintextNoteFields({ [field]: "secret" })).toContain(field);
    }
  });

  it("allows encrypted payloads", () => {
    expect(rejectPlaintextNoteFields({ encryptedBody: { version: "enc-v1" } })).toBeNull();
  });

  it("assertNoPlaintextNoteFields throws PlaintextRejectionError", () => {
    expect(() => assertNoPlaintextNoteFields({ body: "nope" })).toThrow(PlaintextRejectionError);
  });
});
