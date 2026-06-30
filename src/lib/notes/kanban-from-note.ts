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

interface RecognizedActivity {
  title: string;
  checked: boolean;
  kind: "checklist" | "list";
  section?: string;
  key: string;
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

export function recognizeKanbanActivities(
  body: string,
  options: Pick<KanbanFromNoteOptions, "includePlainListItems"> = {}
): RecognizedActivity[] {
  const includePlainListItems = options.includePlainListItems ?? true;
  const activities: RecognizedActivity[] = [];
  const seen = new Set<string>();
  let inCodeBlock = false;
  let section: string | undefined;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || /^\s*>/.test(line)) continue;

    const heading = line.match(HEADING_RE);
    if (heading) {
      section = heading[2].trim();
      continue;
    }

    const checklist = line.match(CHECKLIST_RE);
    if (checklist) {
      const title = checklist[3].trim();
      const key = normalizeKanbanSourceText(title);
      if (title && key && !seen.has(key)) {
        seen.add(key);
        activities.push({
          title,
          checked: checklist[2].toLowerCase() === "x",
          kind: "checklist",
          section,
          key,
        });
      }
      continue;
    }

    if (!includePlainListItems) continue;
    const bullet = line.match(BULLET_RE);
    const numbered = line.match(NUMBERED_RE);
    const title = (bullet?.[1] ?? numbered?.[1])?.trim();
    if (!title) continue;
    const key = normalizeKanbanSourceText(title);
    if (key && !seen.has(key)) {
      seen.add(key);
      activities.push({ title, checked: false, kind: "list", section, key });
    }
  }

  return activities;
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
