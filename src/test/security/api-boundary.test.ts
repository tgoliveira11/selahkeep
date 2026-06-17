import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("private note persistence goes through API endpoints", () => {
  it("notes API route rejects plaintext", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/notes/route.ts"), "utf-8");
    expect(route).toContain("assertNoPlaintextNoteFields");
    expect(route).toContain("createNoteSchema");
  });

  it("no server actions for notes", () => {
    const features = readFileSync(join(process.cwd(), "src/lib/api-client/notes.ts"), "utf-8");
    expect(features).toContain("/api/notes");
    expect(features).not.toContain("use server");
  });

  it("letters API route does not exist", () => {
    expect(() =>
      readFileSync(join(process.cwd(), "src/app/api/letters/route.ts"), "utf-8")
    ).toThrow();
  });
});
