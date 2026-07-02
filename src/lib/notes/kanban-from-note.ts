import {
  createDefaultKanbanColumns,
  type KanbanBoardPlaintext,
  type KanbanCardPlaintext,
  type KanbanColumnPlaintext,
  type KanbanPriority,
} from "@/lib/notes/kanban-types";
import {
  formatDescriptionWithMetadata,
  parseDescriptionMetadata,
  parseTitleTags,
  resolveColumnIdForItem,
} from "@/lib/notes/kanban-card-text";
import { firstKanbanColumn } from "@/lib/notes/kanban-columns";

export interface KanbanFromNoteOptions {
  includePlainListItems?: boolean;
  now?: string;
  boardId?: string;
  createId?: () => string;
}

export interface RecognizedActivity {
  title: string;
  checked: boolean;
  kind: "checklist" | "list";
  description?: string;
  dueDate?: string | null;
  priority?: KanbanPriority | null;
  columnTag?: string;
  tagNames?: string[];
  key: string;
  titleLine: number;
  descriptionEndLine: number;
  linePrefix: string;
}

/** @deprecated Use per-item descriptions via parseKanbanNoteItems */
export interface KanbanChecklistGroup {
  groupIndex: number;
  section?: string;
  description?: string;
  descriptionStartLine?: number;
  descriptionEndLine?: number;
  firstItemLine: number;
  lastItemLine: number;
  items: RecognizedActivity[];
}

const CHECKLIST_RE = /^(\s*[-*+]\s+)\[([ xX])\]\s*(.*)$/;
const BULLET_RE = /^(\s*[-*+]\s+)(?!\[[ xX]\]\s*)(.+)$/i;

export function normalizeKanbanSourceText(text: string): string {
  return text
    .replace(/\[[A-Z][A-Z0-9 ]*\]/g, "")
    .replace(/\[[ xX]\]/g, "")
    .replace(/\[\d{4}-\d{2}-\d{2}\]/g, "")
    .replace(/\[(LOW|MEDIUM|HIGH|URGENT)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?;:]+$/g, "")
    .toLowerCase();
}

export function hashKanbanSourceBody(body: string): string {
  let hash = 2166136261;
  for (let i = 0; i < body.length; i += 1) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

type RawItemLine = {
  lineIndex: number;
  kind: "checklist" | "list";
  checked: boolean;
  rawTitle: string;
  linePrefix: string;
};

function isItemLine(line: string, includePlainListItems: boolean): RawItemLine | null {
  const checklist = line.match(CHECKLIST_RE);
  if (checklist) {
    const rawTitle = checklist[3].trim();
    if (!rawTitle) return null;
    return {
      lineIndex: 0,
      kind: "checklist",
      checked: checklist[2].toLowerCase() === "x",
      rawTitle,
      linePrefix: checklist[1],
    };
  }

  if (!includePlainListItems) return null;

  const bullet = line.match(BULLET_RE);
  if (bullet) {
    const rawTitle = bullet[2].trim();
    if (!rawTitle) return null;
    return {
      lineIndex: 0,
      kind: "list",
      checked: false,
      rawTitle,
      linePrefix: bullet[1],
    };
  }

  return null;
}

function joinDescriptionLines(lines: string[]): string | undefined {
  const text = lines
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .trim();
  return text || undefined;
}

/**
 * Parses checklist and bullet items. Description is prose between one item line
 * and the next item line (not shared across groups).
 */
export function parseKanbanNoteItems(
  body: string,
  options: Pick<KanbanFromNoteOptions, "includePlainListItems"> = {},
  columns: KanbanColumnPlaintext[] = createDefaultKanbanColumns()
): RecognizedActivity[] {
  const includePlainListItems = options.includePlainListItems ?? true;
  const lines = body.split(/\r?\n/);
  const rawItems: Array<RawItemLine & { lineIndex: number }> = [];
  const seen = new Set<string>();

  let inCodeBlock = false;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trimEnd();
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || /^\s*>/.test(line)) continue;

    const parsed = isItemLine(line, includePlainListItems);
    if (!parsed) continue;

    const { displayTitle, columnTag } = parseTitleTags(parsed.rawTitle, columns);
    const key = normalizeKanbanSourceText(displayTitle);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    rawItems.push({ ...parsed, lineIndex });
  }

  return rawItems.map((item, index) => {
    const nextItemLine = rawItems[index + 1]?.lineIndex ?? lines.length;
    const descriptionLines = lines.slice(item.lineIndex + 1, nextItemLine);
    const rawDescription = joinDescriptionLines(descriptionLines);
    const meta = rawDescription ? parseDescriptionMetadata(rawDescription) : null;
    const { displayTitle, columnTag } = parseTitleTags(item.rawTitle, columns);
    const key = normalizeKanbanSourceText(displayTitle);

    return {
      title: displayTitle,
      checked: item.checked,
      kind: item.kind,
      description: meta?.body || rawDescription,
      dueDate: meta?.dueDate ?? null,
      priority: meta?.priority ?? null,
      columnTag,
      tagNames: meta?.tagNames ?? [],
      key,
      titleLine: item.lineIndex,
      descriptionEndLine: Math.max(item.lineIndex, nextItemLine - 1),
      linePrefix: item.linePrefix,
    };
  });
}

/** @deprecated Prefer parseKanbanNoteItems */
export function parseKanbanNoteGroups(
  body: string,
  options: Pick<KanbanFromNoteOptions, "includePlainListItems"> = {}
): KanbanChecklistGroup[] {
  const items = parseKanbanNoteItems(body, options);
  if (items.length === 0) return [];
  return [
    {
      groupIndex: 0,
      firstItemLine: items[0].titleLine,
      lastItemLine: items[items.length - 1].descriptionEndLine,
      items,
    },
  ];
}

export function recognizeKanbanActivities(
  body: string,
  options: Pick<KanbanFromNoteOptions, "includePlainListItems"> = {},
  columns?: KanbanColumnPlaintext[]
): RecognizedActivity[] {
  return parseKanbanNoteItems(body, options, columns);
}

function activityToCard(
  activity: RecognizedActivity,
  columns: KanbanColumnPlaintext[],
  order: number,
  now: string,
  createId: () => string
): KanbanCardPlaintext {
  const columnId = resolveColumnIdForItem(columns, activity.checked, activity.columnTag);
  return {
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
    statusHistory: [
      {
        at: now,
        columnId,
        columnTitle: columns.find((column) => column.id === columnId)?.title ?? "",
        priority: activity.priority ?? null,
      },
    ],
  };
}

export function createKanbanBoardFromNote(
  noteId: string,
  noteTitle: string,
  body: string,
  options: KanbanFromNoteOptions = {}
): KanbanBoardPlaintext {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const columns = createDefaultKanbanColumns();
  const activities = parseKanbanNoteItems(body, options, columns);

  const cards = activities.map((activity, order) => {
    const columnId = resolveColumnIdForItem(columns, activity.checked, activity.columnTag);
    const columnCardsBefore = activities
      .slice(0, order)
      .filter((item) => resolveColumnIdForItem(columns, item.checked, item.columnTag) === columnId)
      .length;
    return activityToCard(activity, columns, columnCardsBefore, now, createId);
  });

  return {
    schemaVersion: 1,
    boardId: options.boardId ?? createId(),
    scope: "note",
    noteId,
    title: noteTitle.trim() ? `${noteTitle.trim()} board` : "Note board",
    columns,
    cards,
    labels: [],
    generatedFrom: {
      at: now,
      bodyHash: hashKanbanSourceBody(body),
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createStandaloneKanbanBoard(
  title: string,
  options: Omit<KanbanFromNoteOptions, "includePlainListItems"> = {}
): KanbanBoardPlaintext {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const boardId = options.boardId ?? createId();
  return {
    schemaVersion: 1,
    boardId,
    scope: "standalone",
    noteId: null,
    title: title.trim() || "Untitled board",
    columns: createDefaultKanbanColumns(),
    cards: [],
    labels: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function mergeKanbanBoardFromNote(
  board: KanbanBoardPlaintext,
  body: string,
  options: KanbanFromNoteOptions = {}
): { board: KanbanBoardPlaintext; added: number } {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const existingKeys = new Set(
    board.cards.map((card) => card.source?.key).filter((key): key is string => Boolean(key))
  );
  const first = firstKanbanColumn(board.columns);
  const todoOrderStart = board.cards.filter((card) => card.columnId === first.id).length;
  const additions = parseKanbanNoteItems(body, options, board.columns)
    .filter((activity) => !existingKeys.has(activity.key))
    .map((activity, index) =>
      activityToCard(activity, board.columns, todoOrderStart + index, now, createId)
    );

  if (additions.length === 0) {
    return {
      board: {
        ...board,
        generatedFrom: { at: now, bodyHash: hashKanbanSourceBody(body) },
      },
      added: 0,
    };
  }

  return {
    board: {
      ...board,
      cards: [...board.cards, ...additions],
      generatedFrom: { at: now, bodyHash: hashKanbanSourceBody(body) },
      updatedAt: now,
    },
    added: additions.length,
  };
}
