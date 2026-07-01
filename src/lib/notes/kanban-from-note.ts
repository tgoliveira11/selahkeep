import {
  createDefaultKanbanColumns,
  type KanbanBoardPlaintext,
  type KanbanCardPlaintext,
  type KanbanColumnPlaintext,
} from "@/lib/notes/kanban-types";

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
  section?: string;
  /** Shared description for all cards in the same contiguous checklist/list group. */
  description?: string;
  /** Zero-based index of the checklist group within the note body. */
  groupIndex: number;
  key: string;
}

export interface KanbanChecklistGroup {
  groupIndex: number;
  section?: string;
  description?: string;
  /** Inclusive line index in the original body where interstitial description starts. */
  descriptionStartLine?: number;
  /** Inclusive line index where interstitial description ends. */
  descriptionEndLine?: number;
  /** Inclusive line index of the first checklist/list item in this group. */
  firstItemLine: number;
  /** Inclusive line index of the last checklist/list item in this group. */
  lastItemLine: number;
  items: RecognizedActivity[];
}

const CHECKLIST_RE = /^(\s*[-*+]\s+)\[([ xX])\]\s*(.*)$/;
const BULLET_RE = /^\s*[-*+]\s+(?!\[[ xX]\]\s*)(.+)$/i;
const NUMBERED_RE = /^\s*\d+[.)]\s+(.+)$/;
const HEADING_RE = /^\s{0,3}(#{2,3})\s+(.+?)\s*#*\s*$/;

export function normalizeKanbanSourceText(text: string): string {
  return text
    .replace(/\[[ xX]\]/g, "")
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

function joinDescriptionLines(lines: string[]): string | undefined {
  const text = lines
    .reduce<string[]>((acc, line) => {
      if (line.trim() === "") {
        if (acc.length > 0 && acc[acc.length - 1] !== "") acc.push("");
        return acc;
      }
      acc.push(line.trim());
      return acc;
    }, [])
    .join("\n")
    .trim();
  return text || undefined;
}

function cardDescriptionFromActivity(activity: Pick<RecognizedActivity, "description" | "section">): string | undefined {
  if (activity.description) return activity.description;
  if (activity.section) return `Section: ${activity.section}`;
  return undefined;
}

type LineKind =
  | { type: "checklist"; title: string; checked: boolean }
  | { type: "list"; title: string }
  | { type: "prose" }
  | { type: "blank" }
  | { type: "skip" };

function classifyKanbanLine(
  line: string,
  includePlainListItems: boolean
): LineKind {
  const checklist = line.match(CHECKLIST_RE);
  if (checklist) {
    const title = checklist[3].trim();
    if (!title) return { type: "skip" };
    return {
      type: "checklist",
      title,
      checked: checklist[2].toLowerCase() === "x",
    };
  }

  if (includePlainListItems) {
    const bullet = line.match(BULLET_RE);
    const numbered = line.match(NUMBERED_RE);
    const title = (bullet?.[1] ?? numbered?.[1])?.trim();
    if (title) return { type: "list", title };
  }

  if (line.trim() === "") return { type: "blank" };
  return { type: "prose" };
}

/**
 * Parses note body into checklist groups. Prose immediately before a contiguous
 * run of checklist/list items becomes that group's description (including text
 * above the first group). Blank lines end a checklist run; subsequent prose
 * becomes the description for the next group.
 */
export function parseKanbanNoteGroups(
  body: string,
  options: Pick<KanbanFromNoteOptions, "includePlainListItems"> = {}
): KanbanChecklistGroup[] {
  const includePlainListItems = options.includePlainListItems ?? true;
  const lines = body.split(/\r?\n/);
  const groups: KanbanChecklistGroup[] = [];
  const seen = new Set<string>();

  let inCodeBlock = false;
  let section: string | undefined;
  let inChecklistRun = false;
  let groupIndex = -1;
  let pendingDescriptionLines: string[] = [];
  let pendingDescriptionStartLine: number | undefined;
  let currentGroup: KanbanChecklistGroup | null = null;

  function flushPendingDescription(): string | undefined {
    const description = joinDescriptionLines(pendingDescriptionLines);
    pendingDescriptionLines = [];
    pendingDescriptionStartLine = undefined;
    return description;
  }

  function startGroup(itemLine: number) {
    const descriptionStartLine = pendingDescriptionStartLine;
    const description = flushPendingDescription();
    groupIndex += 1;
    currentGroup = {
      groupIndex,
      section,
      description,
      descriptionStartLine: description ? descriptionStartLine : undefined,
      descriptionEndLine: description ? itemLine - 1 : undefined,
      firstItemLine: itemLine,
      lastItemLine: itemLine,
      items: [],
    };
    groups.push(currentGroup);
    inChecklistRun = true;
  }

  function finishChecklistRun() {
    inChecklistRun = false;
    currentGroup = null;
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trimEnd();
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      if (inChecklistRun) finishChecklistRun();
      pendingDescriptionLines = [];
      pendingDescriptionStartLine = undefined;
      continue;
    }
    if (inCodeBlock || /^\s*>/.test(line)) {
      if (inChecklistRun) finishChecklistRun();
      pendingDescriptionLines = [];
      pendingDescriptionStartLine = undefined;
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      section = heading[2].trim();
      if (inChecklistRun) finishChecklistRun();
      continue;
    }

    const kind = classifyKanbanLine(line, includePlainListItems);
    if (kind.type === "skip") continue;

    if (kind.type === "checklist" || kind.type === "list") {
      const key = normalizeKanbanSourceText(kind.title);
      if (!key || seen.has(key)) continue;

      if (!inChecklistRun) {
        startGroup(lineIndex);
      }

      seen.add(key);
      currentGroup!.lastItemLine = lineIndex;
      currentGroup!.items.push({
        title: kind.title,
        checked: kind.type === "checklist" ? kind.checked : false,
        kind: kind.type === "checklist" ? "checklist" : "list",
        section,
        description: currentGroup!.description,
        groupIndex: currentGroup!.groupIndex,
        key,
      });
      continue;
    }

    if (kind.type === "blank") {
      if (inChecklistRun) finishChecklistRun();
      continue;
    }

    // Prose between checklist groups (or before the first group).
    if (inChecklistRun) finishChecklistRun();
    if (pendingDescriptionStartLine === undefined) pendingDescriptionStartLine = lineIndex;
    pendingDescriptionLines.push(line);
  }

  return groups;
}

export function recognizeKanbanActivities(
  body: string,
  options: Pick<KanbanFromNoteOptions, "includePlainListItems"> = {}
): RecognizedActivity[] {
  return parseKanbanNoteGroups(body, options).flatMap((group) => group.items);
}

function columnByTitle(columns: KanbanColumnPlaintext[], title: string): KanbanColumnPlaintext {
  const column = columns.find((item) => item.title.toLowerCase() === title.toLowerCase());
  if (!column) throw new Error(`Missing ${title} column`);
  return column;
}

function activityToCard(
  activity: RecognizedActivity,
  columnId: string,
  order: number,
  now: string,
  createId: () => string
): KanbanCardPlaintext {
  return {
    id: createId(),
    columnId,
    title: activity.title,
    description: cardDescriptionFromActivity(activity),
    order,
    labelIds: [],
    priority: null,
    dueDate: null,
    createdAt: now,
    updatedAt: now,
    source: { kind: activity.kind, key: activity.key },
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
  const todo = columnByTitle(columns, "To Do");
  const done = columnByTitle(columns, "Done");
  const activities = recognizeKanbanActivities(body, options);
  const openActivities = activities.filter((activity) => !activity.checked);
  const doneActivities = activities.filter((activity) => activity.checked);

  const cards = [
    ...openActivities.map((activity, order) =>
      activityToCard(activity, todo.id, order, now, createId)
    ),
    ...doneActivities.map((activity, order) =>
      activityToCard(activity, done.id, order, now, createId)
    ),
  ];

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
  const todo = columnByTitle(board.columns, "To Do");
  const todoOrderStart = board.cards.filter((card) => card.columnId === todo.id).length;
  const additions = recognizeKanbanActivities(body, options)
    .filter((activity) => !existingKeys.has(activity.key))
    .map((activity, index) =>
      activityToCard(activity, todo.id, todoOrderStart + index, now, createId)
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
