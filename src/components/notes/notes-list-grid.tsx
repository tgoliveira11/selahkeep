import type { NoteViewMode } from "@/lib/notes/note-view-mode";
import { cn } from "@/lib/ui/cn";

interface NotesListGridProps {
  viewMode: NoteViewMode;
  children: React.ReactNode;
  className?: string;
}

/** List-mode container with column header row for scan-friendly note grids. */
export function NotesListGrid({ viewMode, children, className }: NotesListGridProps) {
  if (viewMode !== "list") {
    return (
      <ul className={cn("note-card-grid space-y-3", className)} data-testid="notes-card-mode">
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
