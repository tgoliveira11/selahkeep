/** @vitest-environment happy-dom */
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KanbanCardDialog } from "@/features/kanban/dialog";
import type { KanbanCardPlaintext } from "@/lib/notes/kanban-types";
import { BOARD_ID, USER_ID, encryptedPayload } from "@/test/helpers/fixtures";

vi.mock("@tgoliveira/vault-core/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/vault-core/react")>();
  return {
    ...actual,
    VaultSensitiveRegion: ({ children }: { children: ReactNode }) => children,
    useVaultUnlocked: () => true,
  };
});

const mocks = vi.hoisted(() => ({
  useNoteAttachments: vi.fn(),
}));

vi.mock("@/features/notes/use-note-attachments", () => ({
  useNoteAttachments: mocks.useNoteAttachments,
}));

function sampleCard(overrides: Partial<KanbanCardPlaintext> = {}): KanbanCardPlaintext {
  return {
    id: "card-1",
    columnId: "todo",
    title: "Call mom",
    order: 0,
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("KanbanCardDialog attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useNoteAttachments.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      uploadFile: vi.fn().mockResolvedValue("attachment-1"),
      removeAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      getDecryptedAttachment: vi.fn(),
      getPendingFile: vi.fn().mockReturnValue(null),
      canUpload: true,
    });
  });

  it("scopes the attachments field to the board as owner", () => {
    render(
      <KanbanCardDialog
        card={sampleCard()}
        labels={[]}
        open
        onSave={vi.fn()}
        onCancel={vi.fn()}
        boardId={BOARD_ID}
        userId={USER_ID}
        wrappedKey={encryptedPayload("note_kanban_key", BOARD_ID)}
      />
    );

    expect(screen.getByTestId("kanban-card-attachments-field")).toBeTruthy();
    expect(mocks.useNoteAttachments).toHaveBeenCalledWith(
      expect.objectContaining({ owner: { kind: "board", id: BOARD_ID } })
    );
  });

  it("adds the uploaded attachment id to the card before saving", async () => {
    const onSave = vi.fn();
    const uploadFile = vi.fn().mockResolvedValue("attachment-1");
    mocks.useNoteAttachments.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      uploadFile,
      removeAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      getDecryptedAttachment: vi.fn(),
      getPendingFile: vi.fn().mockReturnValue(null),
      canUpload: true,
    });

    render(
      <KanbanCardDialog
        card={sampleCard()}
        labels={[]}
        open
        onSave={onSave}
        onCancel={vi.fn()}
        boardId={BOARD_ID}
        userId={USER_ID}
        wrappedKey={encryptedPayload("note_kanban_key", BOARD_ID)}
      />
    );

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const input = screen.getByTestId("note-attachments-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadFile).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save card/i })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole("button", { name: /save card/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ attachmentIds: ["attachment-1"] })
      )
    );
  });
});
