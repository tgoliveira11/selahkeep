import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("answered status in encrypted metadata only", () => {
  it("notes table has no plaintext answered column", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/app-schema.ts"), "utf-8");
    const notesSection = schema.slice(schema.indexOf("export const notes"));
    expect(notesSection).not.toMatch(/\banswered:/);
  });

  it("note validation rejects plaintext answered", () => {
    const validation = readFileSync(join(process.cwd(), "src/lib/validation/notes.ts"), "utf-8");
    expect(validation).toContain('"answered"');
    expect(validation).not.toContain("answered: z.boolean()");
  });

  it("note metadata type includes answered", () => {
    const notesCrypto = readFileSync(join(process.cwd(), "src/lib/crypto-client/notes.ts"), "utf-8");
    expect(notesCrypto).toContain("answered: boolean");
  });
});
