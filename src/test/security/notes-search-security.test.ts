import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

describe("notes search security", () => {
  it("does not send search query from notes page to API client", () => {
    const page = readFileSync(
      path.join(root, "src/app/(vault)/notes/page.tsx"),
      "utf8"
    );
    expect(page).not.toMatch(/notesApi\.\w+\([^)]*filters\.search/);
    expect(page).not.toMatch(/fetch\([^)]*search=/);
  });

  it("documents deferred encrypted persistent search index", () => {
    const doc = readFileSync(path.join(root, "SECURITY.md"), "utf8");
    expect(doc).toMatch(/TODO_SECURITY_REVIEW_REQUIRED/);
    expect(doc).toMatch(/in-memory/i);
  });

  it("stores recently viewed inside encrypted vault index only", () => {
    const types = readFileSync(
      path.join(root, "src/lib/crypto-client/vault-index-types.ts"),
      "utf8"
    );
    expect(types).toMatch(/recentlyViewed\?: RecentlyViewedNote\[\]/);
    expect(types).not.toMatch(/title.*recentlyViewed/);
  });
});
