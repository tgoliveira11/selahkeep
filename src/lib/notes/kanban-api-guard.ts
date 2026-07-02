import "server-only";

import { isKanbanEnabled } from "@/lib/notes/kanban-config";

export class KanbanDisabledError extends Error {
  constructor(message = "Kanban is disabled") {
    super(message);
    this.name = "KanbanDisabledError";
  }
}

export function assertKanbanApiEnabled(): void {
  if (!isKanbanEnabled()) {
    throw new KanbanDisabledError();
  }
}
