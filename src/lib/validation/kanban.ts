import { z } from "zod";
import { encryptedPayloadSchema, ENCRYPTION_VERSION } from "./encrypted-payload";

export const createKanbanBoardSchema = z.object({
  id: z.string().uuid(),
  noteId: z.string().uuid().nullable(),
  encryptedBoard: encryptedPayloadSchema,
  encryptedWrappedKey: encryptedPayloadSchema,
  boardEncryptionVersion: z.literal(ENCRYPTION_VERSION),
});

export const updateKanbanBoardSchema = createKanbanBoardSchema.omit({ noteId: true }).extend({
  /** One-way claim: links a standalone board to a note it wasn't created with. */
  claimNoteId: z.string().uuid().optional(),
});

export const createKanbanVersionSchema = z.object({
  id: z.string().uuid(),
  encryptedBoard: encryptedPayloadSchema,
  encryptedWrappedKey: encryptedPayloadSchema,
  boardEncryptionVersion: z.literal(ENCRYPTION_VERSION),
});

export const listKanbanBoardsQuerySchema = z.object({
  noteId: z.string().uuid().optional(),
  scope: z.enum(["standalone"]).optional(),
});

export type CreateKanbanBoardInput = z.infer<typeof createKanbanBoardSchema>;
export type UpdateKanbanBoardInput = z.infer<typeof updateKanbanBoardSchema>;
export type CreateKanbanVersionInput = z.infer<typeof createKanbanVersionSchema>;
export type ListKanbanBoardsQuery = z.infer<typeof listKanbanBoardsQuerySchema>;

export const PLAINTEXT_KANBAN_FIELDS = [
  "kanban",
  "board",
  "boardState",
  "columns",
  "column",
  "cards",
  "card",
  "labels",
  "label",
  "priority",
  "dueDate",
  "title",
  "description",
] as const;

export function rejectPlaintextKanbanFields(body: Record<string, unknown>): string | null {
  for (const field of PLAINTEXT_KANBAN_FIELDS) {
    if (field in body && body[field] !== undefined) {
      return `Plaintext kanban field '${field}' is not allowed`;
    }
  }
  return null;
}
