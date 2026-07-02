import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteMoreActionsMenu } from "@/components/notes/note-more-actions-menu";

function renderMenu(onExportPdf?: () => void) {
  return render(
    <NoteMoreActionsMenu
      pinned={false}
      favorite={false}
      archived={false}
      onTogglePinned={vi.fn()}
      onToggleFavorite={vi.fn()}
      onToggleArchived={vi.fn()}
      onDuplicate={vi.fn()}
      onMoveToTrash={vi.fn()}
      onExportPdf={onExportPdf}
    />
  );
}

describe("NoteMoreActionsMenu", () => {
  it("shows Export as PDF and calls onExportPdf when clicked", () => {
    const onExportPdf = vi.fn();
    renderMenu(onExportPdf);

    fireEvent.click(screen.getByTestId("note-more-actions-menu"));
    fireEvent.click(screen.getByTestId("export-note-pdf"));

    expect(onExportPdf).toHaveBeenCalledTimes(1);
  });

  it("omits Export as PDF when onExportPdf is not provided", () => {
    renderMenu(undefined);

    fireEvent.click(screen.getByTestId("note-more-actions-menu"));

    expect(screen.queryByTestId("export-note-pdf")).toBeNull();
  });

  it("shows an Exporting state and disables the item while a PDF export is running", () => {
    const onExportPdf = vi.fn();
    render(
      <NoteMoreActionsMenu
        pinned={false}
        favorite={false}
        archived={false}
        onTogglePinned={vi.fn()}
        onToggleFavorite={vi.fn()}
        onToggleArchived={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveToTrash={vi.fn()}
        onExportPdf={onExportPdf}
        exportingPdf
      />
    );

    fireEvent.click(screen.getByTestId("note-more-actions-menu"));
    const item = screen.getByTestId("export-note-pdf");

    expect(item.textContent).toMatch(/exporting/i);
    expect(item).toBeDisabled();
  });
});
