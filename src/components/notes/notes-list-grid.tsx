import type { NoteViewMode } from "@/lib/notes/note-view-mode";
import { cn } from "@/lib/ui/cn";

interface NotesListGridProps {
  viewMode: NoteViewMode;
  children: React.ReactNode;
  className?: string;
  /** Card-mode column count at wide widths (mockup: pinned 2, earlier 3). */
  columns?: 2 | 3;
}

/** List-mode container with column header row for scan-friendly note grids. */
export function NotesListGrid({ viewMode, children, className, columns = 3 }: NotesListGridProps) {
  if (viewMode !== "list") {
    return (
      <ul
        className={cn(
          "note-card-grid grid grid-cols-1 gap-3.5 sm:grid-cols-2",
          columns === 3 && "lg:grid-cols-3",
          className
        )}
        data-testid="notes-card-mode"
      >
        {children}
      </ul>
    );
  }

  return (
    <div className={cn("notes-list-grid", className)} data-testid="notes-list-grid">
      <div className="notes-list-grid__header" aria-hidden="true">
        <span>Title</span>
        <span>Category</span>
        <span>Updated</span>
        <span>States</span>
        <span />
      </div>
      <ul className="notes-list-grid__body note-list" data-testid="notes-list-mode">
        {children}
      </ul>
    </div>
  );
}
