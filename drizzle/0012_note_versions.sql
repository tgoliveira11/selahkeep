CREATE TABLE IF NOT EXISTS "note_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"note_id" uuid NOT NULL,
	"vault_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"encrypted_metadata" jsonb NOT NULL,
	"encrypted_wrapped_note_key" jsonb NOT NULL,
	"encrypted_body" jsonb NOT NULL,
	"body_encryption_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_vault_id_user_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."user_vaults"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_versions_note_id_version" ON "note_versions" USING btree ("note_id","version_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_versions_note_id_created_at" ON "note_versions" USING btree ("note_id","created_at");
