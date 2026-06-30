import {
  hashKanbanSourceBody,
  normalizeKanbanSourceText,
  recognizeKanbanActivities,
  type KanbanFromNoteOptions,
} from "@/lib/notes/kanban-from-note";
import { getDoneColumnIds, isCardDone, reorderKanbanCards } from "@/lib/notes/kanban-progress";
import type {
  KanbanBoardPlaintext,
  KanbanCardPlaintext,
  KanbanColumnPlaintext,
} from "@/lib/notes/kanban-types";

export interface KanbanSyncOptions extends KanbanFromNoteOptions {
  /** When true, cards whose source keys disappear from the note are removed. Default true. */
  removeOrphanCards?: boolean;
  /** When true, note lines for deleted board cards are removed. Default true. */
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
const NUMBERED_RE = /^(\s*\d+[.)]\s+)(.+)$/;

function columnByTitle(columns: KanbanColumnPlaintext[], title: string): KanbanColumnPlaintext {
  const column = columns.find((item) => item.title.toLowerCase() === title.toLowerCase());
  if (!column) throw new Error(`Missing ${title} column`);
  return column;
}

function activityToCard(
  activity: ReturnType<typeof recognizeKanbanActivities>[number],
  columnId: string,
  order: number,
  now: string,
  createId: () => string
): KanbanCardPlaintext {
  return {
    id: createId(),
    columnId,
    title: activity.title,
    description: activity.section ? `Section: ${activity.section}` : undefined,
    order,
    labelIds: [],
    priority: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    source: { kind: activity.kind, key: activity.key },
  };
}

/**
 * Applies note body changes to a note-bound board keyed by stable `source.key` IDs.
 * Cards in custom columns (e.g. In Progress) stay put unless the note marks them done.
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
  const activities = recognizeKanbanActivities(body, options);
  const activityByKey = new Map(activities.map((activity) => [activity.key, activity]));
  const todo = columnByTitle(board.columns, "To Do");
  const done = columnByTitle(board.columns, "Done");
  const doneColumnIds = getDoneColumnIds(board.columns);

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

    const inDoneColumn = doneColumnIds.has(card.columnId);
    if (activity.checked && !inDoneColumn) {
      nextCard = { ...nextCard, columnId: done.id, updatedAt: now };
      cardChanged = true;
    } else if (!activity.checked && inDoneColumn) {
      nextCard = { ...nextCard, columnId: todo.id, updatedAt: now };
      cardChanged = true;
    }

    if (cardChanged) updated += 1;
    nextCards.push(nextCard);
  }

  const todoOrderStart = nextCards.filter((card) => card.columnId === todo.id).length;
  for (const activity of activities) {
    if (existingKeys.has(activity.key)) continue;
    nextCards.push(
      activityToCard(activity, todo.id, todoOrderStart + added, now, createId)
    );
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
      generatedFrom: { at: now, bodyHash },
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
    const title = checklist[3].trim();
    return title ? normalizeKanbanSourceText(title) : null;
  }
  const bullet = line.match(BULLET_RE);
  if (bullet) {
    const title = bullet[2].trim();
    return title ? normalizeKanbanSourceText(title) : null;
  }
  const numbered = line.match(NUMBERED_RE);
  if (numbered) {
    const title = numbered[2].trim();
    return title ? normalizeKanbanSourceText(title) : null;
  }
  return null;
}

function formatChecklistLine(prefix: string, checked: boolean, title: string): string {
  const normalizedPrefix = prefix.endsWith(" ") ? prefix : `${prefix}`;
  const marker = normalizedPrefix.match(/^(\s*[-*+]\s+)$/)?.[1] ?? "- ";
  return `${marker}[${checked ? "x" : " "}] ${title}`;
}

function formatListLine(prefix: string, title: string): string {
  if (/^\s*[-*+]\s+$/.test(prefix)) {
    return `${prefix}${title}`;
  }
  if (/^\s*\d+[.)]\s+$/.test(prefix)) {
    return `${prefix}${title}`;
  }
  return `- ${title}`;
}

function cardKeysInBoard(board: KanbanBoardPlaintext): Set<string> {
  return new Set(
    board.cards.map((card) => card.source?.key).filter((key): key is string => Boolean(key))
  );
}

/**
 * Writes board card state back into the source note body for note-bound boards.
 * Manual cards without a source key receive one and are appended as checklist items.
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
  const output: string[] = [];
  let bodyChanged = false;
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine;
    if (/^\s*```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }
    if (inCodeBlock || /^\s*>/.test(line)) {
      output.push(line);
      continue;
    }

    const key = lineKey(line);
    if (!key || !cardByKey.has(key)) {
      if (key && removeOrphanLines && !activeKeys.has(key)) {
        bodyChanged = true;
        continue;
      }
      output.push(line);
      continue;
    }

    const card = cardByKey.get(key)!;
    const done = isCardDone(card, nextBoard.columns);
    const checklist = line.match(CHECKLIST_RE);
    if (checklist) {
      const nextLine = formatChecklistLine(checklist[1], done, card.title);
      if (nextLine !== line) bodyChanged = true;
      output.push(nextLine);
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      const nextLine = done
        ? formatChecklistLine(bullet[1], true, card.title)
        : formatListLine(bullet[1], card.title);
      if (nextLine !== line) bodyChanged = true;
      output.push(nextLine);
      continue;
    }

    const numbered = line.match(NUMBERED_RE);
    if (numbered) {
      const nextLine = done
        ? formatChecklistLine("- ", true, card.title)
        : formatListLine(numbered[1], card.title);
      if (nextLine !== line) bodyChanged = true;
      output.push(nextLine);
      continue;
    }

    output.push(line);
  }

  const representedKeys = new Set<string>();
  for (const line of output) {
    const key = lineKey(line);
    if (key) representedKeys.add(key);
  }

  const appendLines: string[] = [];
  for (const card of nextBoard.cards) {
    const key = card.source?.key;
    if (!key || representedKeys.has(key)) continue;
    const done = isCardDone(card, nextBoard.columns);
    appendLines.push(formatChecklistLine("- ", done, card.title));
    representedKeys.add(key);
    bodyChanged = true;
  }

  let nextBody = output.join("\n");
  if (appendLines.length > 0) {
    if (nextBody.length > 0 && !nextBody.endsWith("\n")) {
      nextBody += "\n";
    }
    nextBody += appendLines.join("\n");
  }

  return {
    body: nextBody,
    board: boardChanged ? { ...nextBoard, updatedAt: now } : nextBoard,
    changed: bodyChanged || boardChanged,
  };
}

/** Applies board → note then note → board to converge both sides after a board edit. */
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

/** Applies note → board then board → note to converge both sides after a note edit. */
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
