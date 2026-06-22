import { describe, it, expect } from "vitest";
import {
  getMaxAttachmentSizeMb,
  getMaxAttachmentsPerNote,
  getMaxTotalStorageMb,
} from "@/lib/config/attachment-policy";

describe("attachment policy", () => {
  it("uses defaults", () => {
    expect(getMaxAttachmentSizeMb({})).toBe(10);
    expect(getMaxAttachmentsPerNote({})).toBe(10);
    expect(getMaxTotalStorageMb({})).toBe(100);
  });

  it("reads env overrides", () => {
    expect(
      getMaxAttachmentSizeMb({ MAX_ATTACHMENT_SIZE_MB: "5" })
    ).toBe(5);
  });
});
