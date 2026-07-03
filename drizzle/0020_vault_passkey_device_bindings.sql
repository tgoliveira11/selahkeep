CREATE TABLE "vault_passkey_device_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"passkey_credential_id" uuid NOT NULL,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "vault_passkey_device_bindings" ADD CONSTRAINT "vault_passkey_device_bindings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_passkey_device_bindings" ADD CONSTRAINT "vault_passkey_device_bindings_passkey_credential_id_passkey_credentials_id_fk" FOREIGN KEY ("passkey_credential_id") REFERENCES "public"."passkey_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vault_passkey_device_bindings_credential" ON "vault_passkey_device_bindings" USING btree ("passkey_credential_id");--> statement-breakpoint
CREATE INDEX "idx_vault_passkey_device_bindings_user_id" ON "vault_passkey_device_bindings" USING btree ("user_id");
