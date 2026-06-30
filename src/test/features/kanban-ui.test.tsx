/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { GenerateFromNotePanel } from "@/features/kanban/generate-panel";
import { KanbanBoard } from "@/features/kanban/board";
import { KanbanBoardList } from "@/features/kanban/board-list";
import { KanbanMoveMenu } from "@/features/kanban/move-menu";
import { KanbanVersionHistory } from "@/features/kanban/version-history";
import type { KanbanBoardPlaintext } from "@/lib/notes/kanban-types";
import { BOARD_ID, KANBAN_VERSION_ID, NOTE_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  useKanbanVersions: vi.fn(),
}));

vi.mock("@/features/notes/use-kanban", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/notes/use-kanban")>();
  return {
    ...actual,
    useKanbanVersions: mocks.useKanbanVersions,
  };
});

function sampleBoard(): KanbanBoardPlaintext {
  return {
    schemaVersion: 1,
    boardId: BOARD_ID,
    scope: "note",
    noteId: NOTE_ID,
    title: "Note board",
    columns: [
      { id: "todo", title: "To Do", order: 0, isDoneColumn: false },
      { id: "done", title: "Done", order: 1, isDoneColumn: true },
    ],
    cards: [
      {
        id: "card-1",
        columnId: "todo",
        title: "Call mom",
        description: "Section: Care",
        order: 0,
        dueDate: "2026-07-01",
        priority: "high",
        labelIds: ["label-1"],
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
    ],
    labels: [{ id: "label-1", name: "Care", color: "lilac" }],
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  };
}

describe("kanban UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useKanbanVersions.mockReturnValue({
      versions: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      loadVersionContent: vi.fn(),
    });
  });

  it("previews generated note activities and creates a board accessibly", async () => {
    const onCreate = vi.fn();
    const { container } = render(
      <GenerateFromNotePanel
        noteId={NOTE_ID}
        noteTitle="Care"
        body={"## Care\n- [ ] Call mom\n- [x] Book appointment"}
        onCreate={onCreate}
      />
    );

    expect(screen.getByTestId("kanban-generate-panel")).toBeInTheDocument();
    expect(screen.getByText("Call mom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create board/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("moves a card to done and opens the resolve reflection dialog", async () => {
    const onChange = vi.fn();
    const onResolveNote = vi.fn();
    render(
      <KanbanBoard
        board={sampleBoard()}
        onChange={onChange}
        onResolveNote={onResolveNote}
        noteResolved={false}
      />
    );

    fireEvent.change(screen.getByLabelText("Move Call mom"), { target: { value: "done" } });

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId("resolved-reflection-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("resolve-without-reflection"));
    expect(onResolveNote).toHaveBeenCalledWith(null);
  });

  it("offers to reopen a resolved note when a done card moves out", async () => {
    const board = sampleBoard();
    const doneBoard = {
      ...board,
      cards: [{ ...board.cards[0], columnId: "done" }],
    };
    const onReopenNote = vi.fn();
    render(
      <KanbanBoard
        board={doneBoard}
        onChange={vi.fn()}
        onReopenNote={onReopenNote}
        noteResolved
      />
    );

    fireEvent.change(screen.getByLabelText("Move Call mom"), { target: { value: "todo" } });
    expect(await screen.findByTestId("kanban-reopen-suggestion")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reopen note/i }));
    expect(onReopenNote).toHaveBeenCalledTimes(1);
  });

  it("restores a board version and renders semantic diff", async () => {
    const oldBoard = sampleBoard();
    const currentBoard = {
      ...oldBoard,
      cards: [{ ...oldBoard.cards[0], columnId: "done", title: "Call mom today" }],
    };
    const loadVersionContent = vi.fn().mockResolvedValue(oldBoard);
    const reload = vi.fn();
    mocks.useKanbanVersions.mockReturnValue({
      versions: [
        {
          id: KANBAN_VERSION_ID,
          boardId: BOARD_ID,
          noteId: NOTE_ID,
          vaultId: "vault-1",
          versionNumber: 1,
          encryptedBoard: {},
          encryptedWrappedKey: {},
          boardEncryptionVersion: "enc-v1",
          createdAt: "2026-06-30T00:00:00.000Z",
        },
      ],
      loading: false,
      error: null,
      reload,
      loadVersionContent,
    });
    const onRestore = vi.fn();

    render(
      <KanbanVersionHistory
        boardId={BOARD_ID}
        enabled
        currentBoard={currentBoard}
        onRestore={onRestore}
      />
    );

    fireEvent.click(screen.getByTestId("kanban-version-history-toggle"));
    expect(await screen.findByTestId("kanban-version-diff")).toHaveTextContent("Moved Call mom");
    fireEvent.click(screen.getByTestId("kanban-version-restore-1"));
    fireEvent.click(screen.getByText("Restore board"));
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(oldBoard));
  });

  it("keeps the mobile move menu reachable", () => {
    const onMove = vi.fn();
    render(
      <KanbanMoveMenu
        card={sampleBoard().cards[0]}
        columns={sampleBoard().columns}
        onMove={onMove}
      />
    );

    fireEvent.change(screen.getByLabelText("Move Call mom"), { target: { value: "done" } });
    expect(onMove).toHaveBeenCalledWith("done");
  });

  it("lists standalone boards and creates one accessibly", async () => {
    const standalone = { ...sampleBoard(), scope: "standalone" as const, noteId: null };
    const onCreate = vi.fn();
    const { container } = render(
      <KanbanBoardList boards={[standalone]} onCreate={onCreate} />
    );

    expect(screen.getByTestId(`kanban-board-list-item-${BOARD_ID}`)).toHaveTextContent("Note board");
    fireEvent.change(screen.getByLabelText("Board title"), { target: { value: "Home" } });
    fireEvent.click(screen.getByRole("button", { name: /create board/i }));
    expect(onCreate).toHaveBeenCalledWith("Home");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("lists note-bound boards in a separate section", () => {
    const noteBoard = sampleBoard();
    render(<KanbanBoardList boards={[]} noteBoards={[noteBoard]} onCreate={vi.fn()} />);

    expect(screen.getByTestId("kanban-note-board-list")).toBeInTheDocument();
    expect(screen.getByTestId(`kanban-board-list-item-${BOARD_ID}`)).toHaveTextContent("Note board");
    expect(screen.getByRole("link", { name: "Open note" })).toHaveAttribute("href", `/notes/${NOTE_ID}`);
    expect(screen.getByText("No standalone boards yet")).toBeInTheDocument();
  });
});
