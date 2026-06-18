import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("note organization metadata security", () => {
  const schema = readFileSync(join(process.cwd(), "src/lib/db/app-schema.ts"), "utf8");
  const validation = readFileSync(join(process.cwd(), "src/lib/validation/notes.ts"), "utf8");
  const notesCrypto = readFileSync(join(process.cwd(), "src/lib/crypto-client/notes.ts"), "utf8");

  it("notes table has no plaintext lifecycle columns", () => {
    const notesSection = schema.slice(schema.indexOf('export const notes'));
    for (const field of ["pinned", "favorite", "archived", "trashed", "trashedAt", "answered"]) {
      expect(notesSection).not.toMatch(new RegExp(`\\b${field}:`));
    }
  });

  it("note API validation rejects plaintext organization fields", () => {
    for (const field of [
      "title",
      "pinned",
      "favorite",
      "archived",
      "trashed",
      "tags",
      "categoryId",
      "answered",
    ]) {
      expect(validation).toContain(`"${field}"`);
    }
    expect(validation).not.toContain("pinned: z.boolean()");
  });

  it("lifecycle fields live in encrypted note metadata type", () => {
    expect(notesCrypto).toContain("pinned: boolean");
    expect(notesCrypto).toContain("favorite: boolean");
    expect(notesCrypto).toContain("archived: boolean");
    expect(notesCrypto).toContain("trashed: boolean");
  });

  it("saved views are stored in encrypted vault index types", () => {
    const indexTypes = readFileSync(
      join(process.cwd(), "src/lib/crypto-client/vault-index-types.ts"),
      "utf8"
    );
    expect(indexTypes).toContain("savedViews?: SavedView[]");
  });
});
