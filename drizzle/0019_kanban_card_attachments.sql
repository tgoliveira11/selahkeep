ALTER TABLE "note_attachments" ALTER COLUMN "note_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD COLUMN "board_id" uuid REFERENCES "note_kanban_boards"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "chk_note_attachments_owner" CHECK (num_nonnulls("note_id", "board_id") = 1);--> statement-breakpoint
CREATE INDEX "idx_note_attachments_board_id" ON "note_attachments" USING btree ("board_id");
