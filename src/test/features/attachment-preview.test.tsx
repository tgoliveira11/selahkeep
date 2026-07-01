import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AttachmentPreview } from "@/components/notes/attachment-preview";

describe("AttachmentPreview", () => {
  const createObjectURL = vi.fn(() => "blob:preview-test");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders an image preview from decrypted bytes", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    render(
      <AttachmentPreview
        metadata={{ filename: "photo.png", mimeType: "image/png", sizeBytes: 4 }}
        loadDecrypted={async () => ({
          metadata: { filename: "photo.png", mimeType: "image/png", sizeBytes: 4 },
          bytes,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("attachment-preview-image")).toBeInTheDocument();
    });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("renders truncated text without blob URLs", async () => {
    const bytes = new TextEncoder().encode("hello preview");
    render(
      <AttachmentPreview
        metadata={{ filename: "note.txt", mimeType: "text/plain", sizeBytes: bytes.length }}
        loadDecrypted={async () => ({
          metadata: { filename: "note.txt", mimeType: "text/plain", sizeBytes: bytes.length },
          bytes,
        })}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("hello preview")).toBeInTheDocument();
    });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("skips preview for unsupported types", () => {
    render(
      <AttachmentPreview
        metadata={{
          filename: "sheet.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          sizeBytes: 100,
        }}
        loadDecrypted={async () => {
          throw new Error("should not load");
        }}
      />
    );

    expect(screen.queryByTestId("attachment-preview")).not.toBeInTheDocument();
  });
});
