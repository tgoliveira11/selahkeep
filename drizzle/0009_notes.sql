CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vault_id" uuid NOT NULL,
	"encrypted_metadata" jsonb NOT NULL,
	"encrypted_wrapped_note_key" jsonb NOT NULL,
	"encrypted_body" jsonb NOT NULL,
	"body_encryption_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_vault_id_user_vaults_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."user_vaults"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notes_vault_id_created_at" ON "notes" USING btree ("vault_id","created_at");
