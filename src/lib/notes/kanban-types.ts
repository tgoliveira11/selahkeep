export type KanbanPriority = "low" | "medium" | "high" | "urgent";
export type KanbanBoardScope = "note" | "standalone";

export interface KanbanCardStatusEvent {
  at: string;
  columnId: string;
  columnTitle: string;
  priority?: KanbanPriority | null;
}

export interface KanbanColumnPlaintext {
  id: string;
  title: string;
  order: number;
  isDoneColumn: boolean;
  wipLimit?: number;
}

export interface KanbanLabelPlaintext {
  id: string;
  name: string;
  color: "lilac" | "success" | "warning" | "danger" | "info" | "accent";
}

export interface KanbanCardPlaintext {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  order: number;
  dueDate?: string | null;
  priority?: KanbanPriority | null;
  labelIds?: string[];
  createdAt: string;
  updatedAt: string;
  source?: {
    kind: "checklist" | "list" | "heading" | "manual";
    key?: string;
  };
  statusHistory?: KanbanCardStatusEvent[];
}

export interface KanbanBoardPlaintext {
  schemaVersion: 1;
  boardId: string;
  scope: KanbanBoardScope;
  noteId: string | null;
  title: string;
  columns: KanbanColumnPlaintext[];
  cards: KanbanCardPlaintext[];
  labels: KanbanLabelPlaintext[];
  generatedFrom?: {
    at: string;
    bodyHash: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type KanbanBoardIndexEntry = {
  id: string;
  title: string;
  total: number;
  done: number;
  updatedAt: string;
};

export const DEFAULT_KANBAN_LABEL_COLORS: KanbanLabelPlaintext["color"][] = [
  "lilac",
  "success",
  "warning",
  "danger",
  "info",
  "accent",
];

export function createDefaultKanbanColumns(): KanbanColumnPlaintext[] {
  return [
    { id: crypto.randomUUID(), title: "To Do", order: 0, isDoneColumn: false },
    { id: crypto.randomUUID(), title: "In Progress", order: 1, isDoneColumn: false },
    { id: crypto.randomUUID(), title: "Done", order: 2, isDoneColumn: true },
  ];
}
