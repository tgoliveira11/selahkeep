import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("private letter persistence goes through API endpoints", () => {
  it("letters API route rejects plaintext", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/letters/route.ts"),
      "utf-8"
    );
    expect(route).toContain("assertNoPlaintextFields");
    expect(route).toContain("createLetterSchema");
  });

  it("no server actions for letters", () => {
    const features = readFileSync(
      join(process.cwd(), "src/lib/api-client/letters.ts"),
      "utf-8"
    );
    expect(features).toContain("/api/letters");
    expect(features).not.toContain("use server");
  });
});
