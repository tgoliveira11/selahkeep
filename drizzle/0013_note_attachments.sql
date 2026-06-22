CREATE TABLE IF NOT EXISTS "note_attachments" (
  "id" uuid PRIMARY KEY NOT NULL,
  "note_id" uuid NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "vault_id" uuid NOT NULL REFERENCES "user_vaults"("id") ON DELETE CASCADE,
  "encrypted_metadata" jsonb NOT NULL,
  "encrypted_blob" jsonb NOT NULL,
  "blob_encryption_version" text NOT NULL,
  "ciphertext_bytes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_note_attachments_note_id"
  ON "note_attachments" ("note_id");

CREATE INDEX IF NOT EXISTS "idx_note_attachments_vault_id"
  ON "note_attachments" ("vault_id");
