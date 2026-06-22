import { describe, it, expect } from "vitest";
import {
  attachmentPreviewKind,
  canPreviewAttachment,
  truncateTextPreview,
} from "@/lib/notes/attachment-preview";

describe("attachmentPreviewKind", () => {
  it("classifies images, pdf, text, and media", () => {
    expect(attachmentPreviewKind("image/png", "photo.png")).toBe("image");
    expect(attachmentPreviewKind("application/pdf", "doc.pdf")).toBe("pdf");
    expect(attachmentPreviewKind("", "report.pdf")).toBe("pdf");
    expect(attachmentPreviewKind("text/plain", "notes.txt")).toBe("text");
    expect(attachmentPreviewKind("", "readme.md")).toBe("text");
    expect(attachmentPreviewKind("audio/mpeg", "clip.mp3")).toBe("audio");
    expect(attachmentPreviewKind("video/mp4", "clip.mp4")).toBe("video");
  });

  it("returns none for office binaries without browser preview", () => {
    expect(
      attachmentPreviewKind(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "file.docx"
      )
    ).toBe("none");
    expect(canPreviewAttachment("application/zip", "archive.zip")).toBe(false);
  });

  it("truncates long text previews", () => {
    const long = "a".repeat(3_000);
    const preview = truncateTextPreview(long, 100);
    expect(preview.length).toBeLessThan(long.length);
    expect(preview.endsWith("…")).toBe(true);
  });
});
