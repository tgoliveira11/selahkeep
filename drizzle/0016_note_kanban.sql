CREATE TABLE IF NOT EXISTS "note_kanban_boards" (
  "id" uuid PRIMARY KEY NOT NULL,
  "note_id" uuid REFERENCES "notes"("id") ON DELETE CASCADE,
  "vault_id" uuid NOT NULL REFERENCES "user_vaults"("id") ON DELETE CASCADE,
  "encrypted_board" jsonb NOT NULL,
  "encrypted_wrapped_key" jsonb NOT NULL,
  "board_encryption_version" text NOT NULL,
  "version_number" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_note_kanban_boards_vault_id"
  ON "note_kanban_boards" ("vault_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_note_kanban_boards_note_id"
  ON "note_kanban_boards" ("note_id")
  WHERE "note_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "note_kanban_versions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "board_id" uuid NOT NULL REFERENCES "note_kanban_boards"("id") ON DELETE CASCADE,
  "note_id" uuid REFERENCES "notes"("id") ON DELETE CASCADE,
  "vault_id" uuid NOT NULL REFERENCES "user_vaults"("id") ON DELETE CASCADE,
  "version_number" integer NOT NULL,
  "encrypted_board" jsonb NOT NULL,
  "encrypted_wrapped_key" jsonb NOT NULL,
  "board_encryption_version" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_note_kanban_versions_board_id_version"
  ON "note_kanban_versions" ("board_id", "version_number");

CREATE INDEX IF NOT EXISTS "idx_note_kanban_versions_board_id_created"
  ON "note_kanban_versions" ("board_id", "created_at");
