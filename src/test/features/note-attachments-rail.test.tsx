import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoteAttachmentsRail } from "@/components/notes/note-attachments-rail";
import { USER_ID, NOTE_ID } from "@/test/helpers/fixtures";

vi.mock("@/features/notes/use-note-attachments", () => ({
  useNoteAttachments: vi.fn(),
}));

describe("NoteAttachmentsRail", () => {
  beforeEach(async () => {
    const { useNoteAttachments } = await import("@/features/notes/use-note-attachments");
    vi.mocked(useNoteAttachments).mockReturnValue({
      items: [
        {
          id: "att-1",
          metadata: { filename: "notes.pdf", mimeType: "application/pdf", sizeBytes: 2048 },
        },
      ],
      loading: false,
      error: null,
      uploadFile: vi.fn(),
      removeAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      getDecryptedAttachment: vi.fn(),
      getPendingFile: vi.fn(),
      reload: vi.fn(),
      canUpload: false,
    });
  });

  it("renders the rail card with attachment list", () => {
    render(
      <NoteAttachmentsRail
        noteId={NOTE_ID}
        userId={USER_ID}
        wrappedKey={{} as never}
        enabled
      />
    );
    expect(screen.getByTestId("note-attachments-rail")).toBeTruthy();
    expect(screen.getByText("Attachments")).toBeTruthy();
    expect(screen.getByText("notes.pdf")).toBeTruthy();
    expect(screen.queryByTestId("note-attachment-rail-preview")).toBeNull();
    expect(screen.getByTestId("note-attachments-rail-list")).toBeTruthy();
  });

  it("shows empty state when there are no files", async () => {
    const { useNoteAttachments } = await import("@/features/notes/use-note-attachments");
    vi.mocked(useNoteAttachments).mockReturnValue({
      items: [],
      loading: false,
      error: null,
      uploadFile: vi.fn(),
      removeAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      getDecryptedAttachment: vi.fn(),
      getPendingFile: vi.fn(),
      reload: vi.fn(),
      canUpload: false,
    });

    render(
      <NoteAttachmentsRail
        noteId={NOTE_ID}
        userId={USER_ID}
        wrappedKey={{} as never}
        enabled
      />
    );
    expect(screen.getByTestId("note-attachments-rail-empty")).toBeTruthy();
  });
});
