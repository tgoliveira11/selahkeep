import {
  hashKanbanSourceBody,
  normalizeKanbanSourceText,
  parseKanbanNoteItems,
  type KanbanFromNoteOptions,
  type RecognizedActivity,
} from "@/lib/notes/kanban-from-note";
import {
  formatDescriptionWithMetadata,
  formatItemTitleForNote,
  resolveColumnIdForCard,
  resolveColumnIdForItem,
} from "@/lib/notes/kanban-card-text";
import { firstKanbanColumn, sortKanbanColumns } from "@/lib/notes/kanban-columns";
import { reorderKanbanCards } from "@/lib/notes/kanban-progress";
import type {
  KanbanBoardPlaintext,
  KanbanCardPlaintext,
  KanbanCardStatusEvent,
  KanbanColumnPlaintext,
} from "@/lib/notes/kanban-types";

export interface KanbanSyncOptions extends KanbanFromNoteOptions {
  removeOrphanCards?: boolean;
  removeOrphanLines?: boolean;
}

export interface SyncBoardFromNoteResult {
  board: KanbanBoardPlaintext;
  changed: boolean;
  added: number;
  updated: number;
  removed: number;
}

export interface SyncNoteFromBoardResult {
  body: string;
  board: KanbanBoardPlaintext;
  changed: boolean;
}

const CHECKLIST_RE = /^(\s*[-*+]\s+)\[([ xX])\]\s*(.*)$/;
const BULLET_RE = /^(\s*[-*+]\s+)(?!\[[ xX]\]\s*)(.+)$/i;

function appendStatusHistory(
  card: KanbanCardPlaintext,
  columns: KanbanColumnPlaintext[],
  now: string
): KanbanCardPlaintext {
  const column = columns.find((item) => item.id === card.columnId);
  if (!column) return card;

  const history = card.statusHistory ?? [];
  const last = history[history.length - 1];
  if (
    last &&
    last.columnId === card.columnId &&
    last.priority === (card.priority ?? null)
  ) {
    return card;
  }

  const event: KanbanCardStatusEvent = {
    at: now,
    columnId: card.columnId,
    columnTitle: column.title,
    priority: card.priority ?? null,
  };

  return { ...card, statusHistory: [...history, event] };
}

function activityToCard(
  activity: RecognizedActivity,
  columns: KanbanColumnPlaintext[],
  order: number,
  now: string,
  createId: () => string
): KanbanCardPlaintext {
  const columnId = resolveColumnIdForItem(columns, activity.checked, activity.columnTag);
  const card: KanbanCardPlaintext = {
    id: createId(),
    columnId,
    title: activity.title,
    description: formatDescriptionWithMetadata(
      activity.description,
      activity.dueDate,
      activity.priority,
      activity.tagNames
    ),
    order,
    labelIds: [],
    tagNames: activity.tagNames ?? [],
    priority: activity.priority ?? null,
    dueDate: activity.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
    source: { kind: activity.kind, key: activity.key },
  };
  return appendStatusHistory(card, columns, now);
}

/**
 * Applies note body changes to a note-bound board keyed by stable `source.key` IDs.
 */
export function syncBoardFromNoteBody(
  board: KanbanBoardPlaintext,
  body: string,
  options: KanbanSyncOptions = {}
): SyncBoardFromNoteResult {
  if (board.scope !== "note") {
    return { board, changed: false, added: 0, updated: 0, removed: 0 };
  }

  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const removeOrphanCards = options.removeOrphanCards ?? true;
  const activities = parseKanbanNoteItems(body, options, board.columns);
  const activityByKey = new Map(activities.map((activity) => [activity.key, activity]));
  const first = firstKanbanColumn(board.columns);

  let added = 0;
  let updated = 0;
  let removed = 0;
  const existingKeys = new Set<string>();
  const nextCards: KanbanCardPlaintext[] = [];

  for (const card of board.cards) {
    const key = card.source?.key;
    if (!key) {
      nextCards.push(card);
      continue;
    }

    existingKeys.add(key);
    const activity = activityByKey.get(key);
    if (!activity) {
      if (removeOrphanCards) {
        removed += 1;
        continue;
      }
      nextCards.push(card);
      continue;
    }

    let nextCard = card;
    let cardChanged = false;

    if (card.title !== activity.title) {
      nextCard = { ...nextCard, title: activity.title, updatedAt: now };
      cardChanged = true;
    }

    const nextDescription = formatDescriptionWithMetadata(
      activity.description,
      activity.dueDate,
      activity.priority,
      activity.tagNames
    );
    if ((card.description ?? "") !== (nextDescription ?? "")) {
      nextCard = { ...nextCard, description: nextDescription, updatedAt: now };
      cardChanged = true;
    }

    const nextTagNames = activity.tagNames ?? [];
    const currentTagNames = card.tagNames ?? [];
    if (
      nextTagNames.length !== currentTagNames.length ||
      nextTagNames.some((tag, index) => tag !== currentTagNames[index])
    ) {
      nextCard = { ...nextCard, tagNames: nextTagNames, updatedAt: now };
      cardChanged = true;
    }

    if ((card.dueDate ?? null) !== (activity.dueDate ?? null)) {
      nextCard = { ...nextCard, dueDate: activity.dueDate ?? null, updatedAt: now };
      cardChanged = true;
    }

    if ((card.priority ?? null) !== (activity.priority ?? null)) {
      nextCard = { ...nextCard, priority: activity.priority ?? null, updatedAt: now };
      cardChanged = true;
    }

    const desiredColumnId = resolveColumnIdForItem(
      board.columns,
      activity.checked,
      activity.columnTag
    );
    if (card.columnId !== desiredColumnId) {
      nextCard = { ...nextCard, columnId: desiredColumnId, updatedAt: now };
      cardChanged = true;
    }

    if (cardChanged) {
      updated += 1;
      nextCard = appendStatusHistory(nextCard, board.columns, now);
    }
    nextCards.push(nextCard);
  }

  const firstOrderStart = nextCards.filter((card) => card.columnId === first.id).length;
  for (const activity of activities) {
    if (existingKeys.has(activity.key)) continue;
    nextCards.push(activityToCard(activity, board.columns, firstOrderStart + added, now, createId));
    added += 1;
  }

  const bodyHash = hashKanbanSourceBody(body);
  const cardsChanged = added > 0 || removed > 0 || updated > 0;

  if (!cardsChanged && board.generatedFrom?.bodyHash === bodyHash) {
    return { board, changed: false, added: 0, updated: 0, removed: 0 };
  }

  return {
    board: {
      ...board,
      cards: reorderKanbanCards(nextCards),
      generatedFrom: { ...board.generatedFrom, at: now, bodyHash },
      updatedAt: now,
    },
    changed: true,
    added,
    updated,
    removed,
  };
}

function lineKey(line: string): string | null {
  const checklist = line.match(CHECKLIST_RE);
  if (checklist) {
    const title = checklist[3]
      .trim()
      .replace(/\[[A-Z][A-Z0-9 ]*\]/g, "")
      .trim();
    return title ? normalizeKanbanSourceText(title) : null;
  }
  const bullet = line.match(BULLET_RE);
  if (bullet) {
    const title = bullet[2]
      .trim()
      .replace(/\[[A-Z][A-Z0-9 ]*\]/g, "")
      .trim();
    return title ? normalizeKanbanSourceText(title) : null;
  }
  return null;
}

function formatChecklistLine(prefix: string, checked: boolean, title: string): string {
  const marker = prefix.match(/^(\s*[-*+]\s+)$/)?.[1] ?? "- ";
  return `${marker}[${checked ? "x" : " "}] ${title}`;
}

function formatListLine(prefix: string, title: string): string {
  if (/^\s*[-*+]\s+$/.test(prefix)) return `${prefix}${title}`;
  return `- ${title}`;
}

function cardKeysInBoard(board: KanbanBoardPlaintext): Set<string> {
  return new Set(
    board.cards.map((card) => card.source?.key).filter((key): key is string => Boolean(key))
  );
}

export function buildNoteLinesForCard(
  card: KanbanCardPlaintext,
  columns: KanbanColumnPlaintext[],
  originalLine?: string
): string[] {
  const { checked, columnTag } = resolveColumnIdForCard(columns, card.columnId);
  const titleForNote = formatItemTitleForNote(card.title, columns, card.columnId, checked);
  const prefix = originalLine?.match(CHECKLIST_RE)?.[1] ?? originalLine?.match(BULLET_RE)?.[1] ?? "- ";

  const itemLine = originalLine?.match(CHECKLIST_RE)
    ? formatChecklistLine(prefix, checked, titleForNote)
    : originalLine?.match(BULLET_RE)
      ? checked
        ? formatChecklistLine(prefix, true, titleForNote)
        : formatListLine(prefix, titleForNote)
      : formatChecklistLine("- ", checked, titleForNote);

  const description = formatDescriptionWithMetadata(
    card.description,
    card.dueDate,
    card.priority,
    card.tagNames
  );
  if (!description) return [itemLine];
  return [itemLine, ...description.split("\n"), ""];
}

/**
 * Builds a fresh note body from a board's current cards — for turning a
 * standalone board into a note-bound one. Column order determines section
 * order; within a column, cards keep their board order.
 */
export function buildNoteBodyFromBoard(board: KanbanBoardPlaintext): string {
  const lines: string[] = [];
  for (const column of sortKanbanColumns(board.columns)) {
    const cardsInColumn = board.cards
      .filter((card) => card.columnId === column.id)
      .sort((a, b) => a.order - b.order);
    for (const card of cardsInColumn) {
      lines.push(...buildNoteLinesForCard(card, board.columns));
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Writes board card state back into the source note body for note-bound boards.
 */
export function syncNoteBodyFromBoard(
  board: KanbanBoardPlaintext,
  body: string,
  options: KanbanSyncOptions = {}
): SyncNoteFromBoardResult {
  if (board.scope !== "note") {
    return { body, board, changed: false };
  }

  const now = options.now ?? new Date().toISOString();
  const removeOrphanLines = options.removeOrphanLines ?? true;
  const cardByKey = new Map<string, KanbanCardPlaintext>();
  let nextBoard = board;
  let boardChanged = false;

  for (const card of board.cards) {
    if (card.source?.key) {
      cardByKey.set(card.source.key, card);
      continue;
    }
    const key = normalizeKanbanSourceText(card.title);
    if (!key) continue;
    nextBoard = {
      ...nextBoard,
      cards: nextBoard.cards.map((item) =>
        item.id === card.id
          ? { ...item, source: { kind: "manual", key }, updatedAt: now }
          : item
      ),
    };
    cardByKey.set(key, { ...card, source: { kind: "manual", key } });
    boardChanged = true;
  }

  const activeKeys = cardKeysInBoard(nextBoard);
  const lines = body.split(/\r?\n/);
  const skipLines = new Set<number>();
  const replacements = new Map<number, string[]>();
  let bodyChanged = false;
  const activities = parseKanbanNoteItems(body, options, board.columns);

  for (const activity of activities) {
    const card = cardByKey.get(activity.key);
    if (!card) {
      if (removeOrphanLines && !activeKeys.has(activity.key)) {
        for (let line = activity.titleLine; line <= activity.descriptionEndLine; line += 1) {
          skipLines.add(line);
        }
        bodyChanged = true;
      }
      continue;
    }

    const nextBlock = buildNoteLinesForCard(
      card,
      nextBoard.columns,
      lines[activity.titleLine]
    );
    const currentBlock = lines.slice(activity.titleLine, activity.descriptionEndLine + 1);
    const normalizedCurrent = currentBlock.join("\n").trimEnd();
    const normalizedNext = nextBlock.join("\n").trimEnd();
    if (normalizedCurrent !== normalizedNext) {
      bodyChanged = true;
      for (let line = activity.titleLine; line <= activity.descriptionEndLine; line += 1) {
        skipLines.add(line);
      }
      replacements.set(activity.titleLine, nextBlock);
    }
  }

  const output: string[] = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const replacement = replacements.get(lineIndex);
    if (replacement) {
      output.push(...replacement);
      continue;
    }
    if (skipLines.has(lineIndex)) continue;
    output.push(lines[lineIndex]);
  }

  const representedKeys = new Set<string>();
  for (const activity of parseKanbanNoteItems(output.join("\n"), options, board.columns)) {
    representedKeys.add(activity.key);
  }

  const appendLines: string[] = [];
  for (const card of nextBoard.cards) {
    const key = card.source?.key;
    if (!key || representedKeys.has(key)) continue;
    appendLines.push(...buildNoteLinesForCard(card, nextBoard.columns));
    representedKeys.add(key);
    bodyChanged = true;
  }

  let nextBody = output.join("\n");
  if (appendLines.length > 0) {
    if (nextBody.length > 0 && !nextBody.endsWith("\n")) nextBody += "\n";
    nextBody += appendLines.join("\n");
  }

  return {
    body: nextBody,
    board: nextBoard,
    changed: bodyChanged || boardChanged,
  };
}

export function syncNoteAndBoardFromBoardChange(
  board: KanbanBoardPlaintext,
  body: string,
  options: KanbanSyncOptions = {}
): { board: KanbanBoardPlaintext; body: string; changed: boolean } {
  const noteSync = syncNoteBodyFromBoard(board, body, options);
  const boardSync = syncBoardFromNoteBody(noteSync.board, noteSync.body, options);
  return {
    board: boardSync.board,
    body: noteSync.body,
    changed: noteSync.changed || boardSync.changed,
  };
}

export function syncNoteAndBoardFromNoteChange(
  board: KanbanBoardPlaintext,
  body: string,
  options: KanbanSyncOptions = {}
): { board: KanbanBoardPlaintext; body: string; changed: boolean } {
  const boardSync = syncBoardFromNoteBody(board, body, options);
  const noteSync = syncNoteBodyFromBoard(boardSync.board, body, options);
  return {
    board: noteSync.board,
    body: noteSync.body,
    changed: boardSync.changed || noteSync.changed,
  };
}
