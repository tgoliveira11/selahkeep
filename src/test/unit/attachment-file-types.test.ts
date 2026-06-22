import { describe, it, expect } from "vitest";
import { isAllowedAttachmentFile, attachmentRejectionReason } from "@/lib/notes/attachment-file-types";

describe("attachment file types", () => {
  it("allows pdf and png", () => {
    expect(isAllowedAttachmentFile({ name: "doc.pdf", type: "application/pdf" } as File)).toBe(true);
    expect(isAllowedAttachmentFile({ name: "photo.png", type: "image/png" } as File)).toBe(true);
  });

  it("blocks executables", () => {
    expect(isAllowedAttachmentFile({ name: "virus.exe", type: "application/octet-stream" } as File)).toBe(
      false
    );
    expect(attachmentRejectionReason({ name: "virus.exe", type: "application/octet-stream" } as File)).toMatch(
      /not allowed/i
    );
  });
});
