import { describe, it, expect } from "vitest";
import {
  activateDraftField,
  EMPTY_DRAFT_USER_ACTIVATION,
  isDraftActivatedByUser,
} from "@/lib/notes/draft-user-activation";

describe("draft user activation", () => {
  it("starts inactive", () => {
    expect(isDraftActivatedByUser(EMPTY_DRAFT_USER_ACTIVATION)).toBe(false);
  });

  it("activates from title, content, tags, or manual category", () => {
    expect(isDraftActivatedByUser(activateDraftField(EMPTY_DRAFT_USER_ACTIVATION, "title"))).toBe(
      true
    );
    expect(isDraftActivatedByUser(activateDraftField(EMPTY_DRAFT_USER_ACTIVATION, "content"))).toBe(
      true
    );
    expect(isDraftActivatedByUser(activateDraftField(EMPTY_DRAFT_USER_ACTIVATION, "tags"))).toBe(
      true
    );
    expect(
      isDraftActivatedByUser(activateDraftField(EMPTY_DRAFT_USER_ACTIVATION, "manualCategory"))
    ).toBe(true);
  });
});
