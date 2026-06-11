ALTER TABLE "passkey_credentials" ADD COLUMN "friendly_name" text;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "sign_in_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "vault_unlock_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "prf_supported" boolean;--> statement-breakpoint
ALTER TABLE "passkey_credentials" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
UPDATE "passkey_credentials" pc
SET "vault_unlock_enabled" = true,
    "prf_supported" = true
FROM "vault_envelopes" ve
WHERE ve."user_id" = pc."user_id"
  AND ve."method" = 'passkey_authorized_device'
  AND ve."revoked_at" IS NULL
  AND (ve."public_metadata"->>'credentialId') = pc."credential_id";
