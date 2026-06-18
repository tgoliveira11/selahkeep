import { describe, it, expect } from "vitest";
import {
  buildVaultUnlockHref,
  safeNotesReturnTo,
} from "@/lib/notes/safe-return-to";

describe("safeNotesReturnTo", () => {
  it("allows notes list and detail paths", () => {
    expect(safeNotesReturnTo("/notes")).toBe("/notes");
    expect(safeNotesReturnTo("/notes/abc-123")).toBe("/notes/abc-123");
  });

  it("rejects external and unsafe paths", () => {
    expect(safeNotesReturnTo("https://evil.test/notes")).toBeNull();
    expect(safeNotesReturnTo("/vault/unlock")).toBeNull();
    expect(safeNotesReturnTo("//evil.test/notes")).toBeNull();
    expect(safeNotesReturnTo(null)).toBeNull();
  });
});

describe("buildVaultUnlockHref", () => {
  it("includes returnTo for safe notes paths", () => {
    expect(buildVaultUnlockHref("/notes/note-1")).toBe(
      "/vault/unlock?returnTo=%2Fnotes%2Fnote-1"
    );
  });

  it("omits returnTo when path is unsafe", () => {
    expect(buildVaultUnlockHref("https://evil.test")).toBe("/vault/unlock");
  });
});
