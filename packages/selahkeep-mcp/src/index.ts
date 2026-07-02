import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SelahKeepClient } from "./api-client.js";
import {
  decryptKanbanBoard,
  decryptNoteBody,
  decryptNoteMetadata,
  encryptKanbanBoard,
  encryptNoteBody,
  encryptNoteMetadata,
  importIntegrationKey,
  unwrapGrantKey,
} from "./crypto.js";

export function loadConfig() {
  const apiUrl = process.env.SELAHKEEP_API_URL;
  const token = process.env.SELAHKEEP_INTEGRATION_TOKEN;
  const integrationKey = process.env.SELAHKEEP_INTEGRATION_KEY;
  if (!apiUrl || !token || !integrationKey) {
    throw new Error(
      "Missing SELAHKEEP_API_URL, SELAHKEEP_INTEGRATION_TOKEN, or SELAHKEEP_INTEGRATION_KEY"
    );
  }
  return { apiUrl, token, integrationKey };
}

export async function startServer() {
  const config = loadConfig();
  const client = new SelahKeepClient(config);
  const integrationKey = await importIntegrationKey(config.integrationKey);

  const server = new Server({ name: "selahkeep", version: "0.1.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "selahkeep_list_notes",
        description: "List shared notes (id and title)",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "selahkeep_get_note",
        description: "Get a shared note title and markdown body",
        inputSchema: {
          type: "object",
          properties: { noteId: { type: "string" } },
          required: ["noteId"],
        },
      },
      {
        name: "selahkeep_update_note",
        description: "Update a shared note title and/or body",
        inputSchema: {
          type: "object",
          properties: {
            noteId: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["noteId"],
        },
      },
      {
        name: "selahkeep_list_boards",
        description: "List shared kanban boards",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "selahkeep_get_board",
        description: "Get a shared kanban board state",
        inputSchema: {
          type: "object",
          properties: { boardId: { type: "string" } },
          required: ["boardId"],
        },
      },
      {
        name: "selahkeep_update_board",
        description: "Replace a shared kanban board state JSON",
        inputSchema: {
          type: "object",
          properties: {
            boardId: { type: "string" },
            board: { type: "object" },
          },
          required: ["boardId", "board"],
        },
      },
      {
        name: "selahkeep_search_shared",
        description: "Search titles in shared notes and board cards",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "selahkeep_list_notes") {
      const notes = await client.listNotes();
      const summaries = [];
      for (const note of notes) {
        const key = await unwrapGrantKey(note.grant.encryptedWrappedKey, integrationKey);
        const meta = await decryptNoteMetadata(note.encryptedMetadata, key);
        summaries.push({ id: note.id, title: meta.title ?? "Untitled", permissions: note.grant.permissions });
      }
      return { content: [{ type: "text", text: JSON.stringify(summaries, null, 2) }] };
    }

    if (name === "selahkeep_get_note") {
      const noteId = String((args as { noteId?: string }).noteId ?? "");
      const note = await client.getNote(noteId);
      const key = await unwrapGrantKey(note.grant.encryptedWrappedKey, integrationKey);
      const meta = await decryptNoteMetadata(note.encryptedMetadata, key);
      const body = await decryptNoteBody(note.encryptedBody, key);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: note.id, title: meta.title, body }, null, 2),
          },
        ],
      };
    }

    if (name === "selahkeep_update_note") {
      const input = args as { noteId?: string; title?: string; body?: string };
      const noteId = String(input.noteId ?? "");
      const note = await client.getNote(noteId);
      if (note.grant.permissions !== "write") {
        throw new Error("Write permission required");
      }
      const key = await unwrapGrantKey(note.grant.encryptedWrappedKey, integrationKey);
      const meta = await decryptNoteMetadata(note.encryptedMetadata, key);
      const currentBody = await decryptNoteBody(note.encryptedBody, key);
      const nextMeta = { ...meta, title: input.title ?? meta.title ?? "Untitled" };
      const nextBody = input.body ?? currentBody;
      const userId = note.encryptedMetadata.aad.userId;
      await client.updateNote(noteId, {
        encryptedMetadata: await encryptNoteMetadata(userId, noteId, nextMeta, key),
        encryptedBody: await encryptNoteBody(userId, noteId, nextBody, key),
        encryptedWrappedNoteKey: note.encryptedWrappedNoteKey,
        bodyEncryptionVersion: note.bodyEncryptionVersion,
      });
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, id: noteId }) }] };
    }

    if (name === "selahkeep_list_boards") {
      const boards = await client.listBoards();
      const summaries = [];
      for (const board of boards) {
        const key = await unwrapGrantKey(board.grant.encryptedWrappedKey, integrationKey);
        const plain = await decryptKanbanBoard(board.encryptedBoard, key);
        summaries.push({
          id: board.id,
          title: plain.title ?? "Board",
          permissions: board.grant.permissions,
        });
      }
      return { content: [{ type: "text", text: JSON.stringify(summaries, null, 2) }] };
    }

    if (name === "selahkeep_get_board") {
      const boardId = String((args as { boardId?: string }).boardId ?? "");
      const board = await client.getBoard(boardId);
      const key = await unwrapGrantKey(board.grant.encryptedWrappedKey, integrationKey);
      const plain = await decryptKanbanBoard(board.encryptedBoard, key);
      return { content: [{ type: "text", text: JSON.stringify(plain, null, 2) }] };
    }

    if (name === "selahkeep_update_board") {
      const input = args as { boardId?: string; board?: Record<string, unknown> };
      const boardId = String(input.boardId ?? "");
      const board = await client.getBoard(boardId);
      if (board.grant.permissions !== "write") {
        throw new Error("Write permission required");
      }
      const key = await unwrapGrantKey(board.grant.encryptedWrappedKey, integrationKey);
      const nextBoard = input.board ?? (await decryptKanbanBoard(board.encryptedBoard, key));
      const userId = board.encryptedBoard.aad.userId;
      await client.updateBoard(boardId, {
        encryptedBoard: await encryptKanbanBoard(userId, boardId, nextBoard, key),
        encryptedWrappedKey: board.encryptedWrappedKey,
        boardEncryptionVersion: board.boardEncryptionVersion,
      });
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, id: boardId }) }] };
    }

    if (name === "selahkeep_search_shared") {
      const query = String((args as { query?: string }).query ?? "").toLowerCase();
      const hits: Array<{ type: string; id: string; label: string }> = [];
      const notes = await client.listNotes();
      for (const note of notes) {
        const key = await unwrapGrantKey(note.grant.encryptedWrappedKey, integrationKey);
        const meta = await decryptNoteMetadata(note.encryptedMetadata, key);
        const title = (meta.title ?? "").toLowerCase();
        if (title.includes(query)) {
          hits.push({ type: "note", id: note.id, label: meta.title ?? "Untitled" });
        }
      }
      const boards = await client.listBoards();
      for (const board of boards) {
        const key = await unwrapGrantKey(board.grant.encryptedWrappedKey, integrationKey);
        const plain = (await decryptKanbanBoard(board.encryptedBoard, key)) as {
          title?: string;
          cards?: Array<{ id: string; title: string }>;
        };
        if ((plain.title ?? "").toLowerCase().includes(query)) {
          hits.push({ type: "board", id: board.id, label: plain.title ?? "Board" });
        }
        for (const card of plain.cards ?? []) {
          if (card.title.toLowerCase().includes(query)) {
            hits.push({ type: "card", id: card.id, label: card.title });
          }
        }
      }
      return { content: [{ type: "text", text: JSON.stringify(hits, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
