import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN_RECOVERY_UI_COPY = [
  /Generate recovery code/i,
  /Do this later/i,
  /private letters/i,
];

const RECOVERY_UI_FILES = [
  "src/app/(vault)/vault/recovery/page.tsx",
  "src/features/recovery/recovery-phrase-replace.tsx",
];

describe("vault recovery page copy guard", () => {
  it("recovery UI avoids deprecated recovery copy", () => {
    const combined = RECOVERY_UI_FILES.map((file) =>
      readFileSync(join(process.cwd(), file), "utf8")
    ).join("\n");

    for (const pattern of FORBIDDEN_RECOVERY_UI_COPY) {
      expect(combined).not.toMatch(pattern);
    }

    expect(combined).toMatch(/Replace recovery phrase/i);
    expect(combined).toMatch(/Recovery phrase/i);
  });
});
