import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { readModuleSource } from "@/test/helpers/module-source";

describe("letter physical deletion", () => {
  it("letter repository uses DELETE not soft delete", () => {
    const repo = readModuleSource("src/server/repositories/letter-repository.ts");
    expect(repo).toContain(".delete(letters)");
    expect(repo).not.toContain("deletedAt");
    expect(repo).not.toContain("deleted_at");
  });

  it("schema has no deleted_at column on letters", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf-8");
    const lettersSection = schema.slice(schema.indexOf("export const letters"));
    expect(lettersSection).not.toContain("deletedAt");
  });
});
