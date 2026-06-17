import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const FORBIDDEN_COLUMNS = [
  "plaintext_title",
  "plaintext_body",
  'title text',
  'body text',
  'content text',
  'message text',
];

describe("database schema has no plaintext letter columns", () => {
  it("app-schema.ts does not define forbidden plaintext columns for letters", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/app-schema.ts"), "utf-8");
    const lettersSection = schema.slice(schema.indexOf('export const letters'));

    for (const col of FORBIDDEN_COLUMNS) {
      expect(lettersSection).not.toContain(col);
    }

    expect(lettersSection).toContain("encryptedTitle");
    expect(lettersSection).toContain("encryptedBody");
    expect(lettersSection).toContain("encryptedLetterKey");
  });

  it("notes table stores only encrypted fields", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/app-schema.ts"), "utf-8");
    const notesSection = schema.slice(schema.indexOf('export const notes'));

    expect(notesSection).toContain("encryptedMetadata");
    expect(notesSection).toContain("encryptedWrappedNoteKey");
    expect(notesSection).toContain("encryptedBody");
    expect(notesSection).not.toMatch(/\btitle:\s/);
    expect(notesSection).not.toMatch(/\bbody:\s/);
  });
});
