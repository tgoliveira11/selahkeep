import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");
const plan = readFileSync(
  path.join(root, "docs/LTG_VAULT_IMPLEMENTATION_PLAN.md"),
  "utf8"
);

describe("phased plan priority tracks", () => {
  it("documents Track 4 as Search and Discovery with implemented items", () => {
    expect(plan).toMatch(/### Priority Track 4 — Search and Discovery/);
    expect(plan).toMatch(/Local Full-Text Search After Unlock/);
    expect(plan).toMatch(/Search Result Highlighting/);
    expect(plan).toMatch(/Recently Viewed Notes/);
    expect(plan).toMatch(/Encrypted Local Search Index — deferred/);
    expect(plan).toMatch(/TODO_SECURITY_REVIEW_REQUIRED/);
  });

  it("documents Track 5 reflective workflows as implemented", () => {
    expect(plan).toMatch(/### Priority Track 5 — Reflective and Spiritual Workflows/);
    expect(plan).toMatch(/Resolved Reflection/);
    expect(plan).toMatch(/Prayer \/ Reflection Timeline/);
    expect(plan).toMatch(/Remembrance Mode/);
    expect(plan).toMatch(/Weekly Reflection/);
    expect(plan).toMatch(/Prompt Cards/);
    expect(plan).toMatch(/Mostly complete/i);
  });
});
