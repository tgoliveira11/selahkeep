import type {
  KanbanBoardPlaintext,
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
} from "@/lib/notes/kanban-types";

export interface KanbanProgress {
  total: number;
  done: number;
  percent: number;
  complete: boolean;
}

export function getDoneColumnIds(columns: KanbanColumnPlaintext[]): Set<string> {
  return new Set(columns.filter((column) => column.isDoneColumn).map((column) => column.id));
}

export function isCardDone(
  card: KanbanCardPlaintext,
  columns: KanbanColumnPlaintext[]
): boolean {
  return getDoneColumnIds(columns).has(card.columnId);
}

export function getKanbanProgress(board: Pick<KanbanBoardPlaintext, "cards" | "columns">): KanbanProgress {
  const doneColumnIds = getDoneColumnIds(board.columns);
  const total = board.cards.length;
  const done = board.cards.filter((card) => doneColumnIds.has(card.columnId)).length;
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    complete: total > 0 && done === total,
  };
}

export function canDeleteKanbanColumn(
  columns: KanbanColumnPlaintext[],
  columnId: string
): boolean {
  const target = columns.find((column) => column.id === columnId);
  if (!target) return false;
  if (!target.isDoneColumn) return true;
  return columns.filter((column) => column.isDoneColumn).length > 1;
}

export function reorderKanbanCards(cards: KanbanCardPlaintext[]): KanbanCardPlaintext[] {
  const byColumn = new Map<string, KanbanCardPlaintext[]>();
  for (const card of cards) {
    byColumn.set(card.columnId, [...(byColumn.get(card.columnId) ?? []), card]);
  }

  return cards.map((card) => {
    const columnCards = byColumn
      .get(card.columnId)!
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    return { ...card, order: columnCards.findIndex((item) => item.id === card.id) };
  });
}

export function moveKanbanCard(
  board: KanbanBoardPlaintext,
  cardId: string,
  columnId: string,
  order?: number
): KanbanBoardPlaintext {
  const now = new Date().toISOString();
  const targetColumn = board.columns.find((column) => column.id === columnId);
  if (!targetColumn) throw new Error("Column not found");
  const movingCard = board.cards.find((card) => card.id === cardId);
  if (!movingCard) throw new Error("Card not found");

  const remaining = board.cards.filter((card) => card.id !== cardId);
  const targetCards = remaining
    .filter((card) => card.columnId === columnId)
    .sort((a, b) => a.order - b.order);
  const insertAt = Math.max(0, Math.min(order ?? targetCards.length, targetCards.length));
  targetCards.splice(insertAt, 0, {
    ...movingCard,
    columnId,
    order: insertAt,
    updatedAt: now,
  });

  const nextCards = [
    ...remaining.filter((card) => card.columnId !== columnId),
    ...targetCards,
  ];

  return {
    ...board,
    cards: reorderKanbanCards(nextCards),
    updatedAt: now,
  };
}
