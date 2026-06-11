import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { readModuleSource } from "@/test/helpers/module-source";

export const SENTINEL_PHRASE = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

describe("sentinel phrase not in static artifacts", () => {
  it("sentinel phrase is not hardcoded in schema", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf-8");
    expect(schema).not.toContain(SENTINEL_PHRASE);
  });

  it("admin service does not return letter content fields", () => {
    const admin = readFileSync(
      join(process.cwd(), "src/server/services/admin-service.ts"),
      "utf-8"
    );
    expect(admin).not.toContain("encryptedTitle");
    expect(admin).not.toContain("encryptedBody");
    expect(admin).not.toContain("title");
    expect(admin).toContain("letterCount");
  });

  it("API letter responses use encrypted field names only in service layer", () => {
    const letterRepo = readModuleSource("src/server/repositories/letter-repository.ts");
    expect(letterRepo).toContain("encryptedTitle");
    expect(letterRepo).not.toMatch(/\btitle:\s/);
    expect(letterRepo).not.toMatch(/\bbody:\s/);
  });
});
