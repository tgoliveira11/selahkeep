import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("answered status as open metadata", () => {
  it("letters table has answered boolean column", () => {
    const schema = readFileSync(join(process.cwd(), "src/lib/db/app-schema.ts"), "utf-8");
    expect(schema).toContain("answered:");
    expect(schema).toContain("answeredAt:");
  });

  it("update schema allows answered without encrypted fields", () => {
    const validation = readFileSync(
      join(process.cwd(), "src/lib/validation/letters.ts"),
      "utf-8"
    );
    expect(validation).toContain("answered: z.boolean()");
  });
});
