import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";

/** Product extension: vault unlock columns are not in package passkeyCredentials. */
export const passkeyCredentials = pgTable("passkey_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: text("counter").notNull().default("0"),
  transports: jsonb("transports"),
  friendlyName: text("friendly_name"),
  signInEnabled: boolean("sign_in_enabled").notNull().default(true),
  vaultUnlockEnabled: boolean("vault_unlock_enabled").notNull().default(false),
  prfSupported: boolean("prf_supported"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const userVaults = pgTable("user_vaults", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  vaultVersion: text("vault_version").notNull(),
  encryptedVaultSettings: jsonb("encrypted_vault_settings"),
  encryptedVaultIndex: jsonb("encrypted_vault_index"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vaultEnvelopes = pgTable(
  "vault_envelopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    encryptedVaultKey: jsonb("encrypted_vault_key").notNull(),
    kdfMetadata: jsonb("kdf_metadata"),
    publicMetadata: jsonb("public_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("idx_vault_envelopes_user_id_method").on(table.userId, table.method)]
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => userVaults.id, { onDelete: "cascade" }),
    encryptedMetadata: jsonb("encrypted_metadata").notNull(),
    encryptedWrappedNoteKey: jsonb("encrypted_wrapped_note_key").notNull(),
    encryptedBody: jsonb("encrypted_body").notNull(),
    bodyEncryptionVersion: text("body_encryption_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("idx_notes_vault_id_created_at").on(table.vaultId, table.createdAt)]
);

/**
 * Immutable, append-only encrypted snapshots of a note's editable content.
 * Stores only encrypted payloads (no plaintext) — see
 * `docs/TDR_Note_Version_History.md`. Content payloads are AAD-bound to the
 * version `id`; the wrapped note key is bound to the parent `note_id`.
 */
export const noteVersions = pgTable(
  "note_versions",
  {
    id: uuid("id").primaryKey(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => userVaults.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    encryptedMetadata: jsonb("encrypted_metadata").notNull(),
    encryptedWrappedNoteKey: jsonb("encrypted_wrapped_note_key").notNull(),
    encryptedBody: jsonb("encrypted_body").notNull(),
    bodyEncryptionVersion: text("body_encryption_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_note_versions_note_id_version").on(table.noteId, table.versionNumber),
    index("idx_note_versions_note_id_created_at").on(table.noteId, table.createdAt),
  ]
);

/** Encrypted file attachments — blob + metadata ciphertext only (see docs/ENCRYPTED_ATTACHMENTS.md). */
export const noteAttachments = pgTable(
  "note_attachments",
  {
    id: uuid("id").primaryKey(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => userVaults.id, { onDelete: "cascade" }),
    encryptedMetadata: jsonb("encrypted_metadata").notNull(),
    encryptedBlob: jsonb("encrypted_blob").notNull(),
    blobEncryptionVersion: text("blob_encryption_version").notNull(),
    /** Combined ciphertext byte size for storage usage (not plaintext). */
    ciphertextBytes: integer("ciphertext_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_note_attachments_note_id").on(table.noteId),
    index("idx_note_attachments_vault_id").on(table.vaultId),
  ]
);

/**
 * Current encrypted kanban board state. A board may be note-bound or standalone;
 * all columns/cards/labels remain inside `encryptedBoard`.
 */
export const noteKanbanBoards = pgTable(
  "note_kanban_boards",
  {
    id: uuid("id").primaryKey(),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "cascade" }),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => userVaults.id, { onDelete: "cascade" }),
    encryptedBoard: jsonb("encrypted_board").notNull(),
    encryptedWrappedKey: jsonb("encrypted_wrapped_key").notNull(),
    boardEncryptionVersion: text("board_encryption_version").notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_note_kanban_boards_vault_id").on(table.vaultId),
    uniqueIndex("idx_note_kanban_boards_note_id")
      .on(table.noteId)
      .where(sql`${table.noteId} IS NOT NULL`),
  ]
);

/**
 * Immutable encrypted kanban snapshots. Version content is AAD-bound to the
 * snapshot id; the wrapped key follows the current board scope.
 */
export const noteKanbanVersions = pgTable(
  "note_kanban_versions",
  {
    id: uuid("id").primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => noteKanbanBoards.id, { onDelete: "cascade" }),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "cascade" }),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => userVaults.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    encryptedBoard: jsonb("encrypted_board").notNull(),
    encryptedWrappedKey: jsonb("encrypted_wrapped_key").notNull(),
    boardEncryptionVersion: text("board_encryption_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_note_kanban_versions_board_id_version").on(table.boardId, table.versionNumber),
    index("idx_note_kanban_versions_board_id_created").on(table.boardId, table.createdAt),
  ]
);

/** Runtime overrides for vault-core admin config (`/admin/vault/config`). */
export const vaultAdminConfigOverrides = pgTable("vault_admin_config_overrides", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Note = typeof notes.$inferSelect;
export type NoteVersion = typeof noteVersions.$inferSelect;
export type NoteAttachment = typeof noteAttachments.$inferSelect;
export type NoteKanbanBoard = typeof noteKanbanBoards.$inferSelect;
export type NoteKanbanVersion = typeof noteKanbanVersions.$inferSelect;
export type VaultEnvelope = typeof vaultEnvelopes.$inferSelect;
