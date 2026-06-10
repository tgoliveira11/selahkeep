ALTER TABLE "trusted_devices" ADD COLUMN "client_device_id" text;--> statement-breakpoint
UPDATE "trusted_devices"
SET "client_device_id" = "device_public_key"->>'deviceId'
WHERE "client_device_id" IS NULL
  AND "device_public_key"->>'deviceId' IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_trusted_devices_user_client_device_id" ON "trusted_devices" USING btree ("user_id","client_device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_trusted_devices_active_user_client_device_id" ON "trusted_devices" USING btree ("user_id","client_device_id") WHERE "revoked_at" IS NULL AND "client_device_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_webauthn_challenges_lookup" ON "webauthn_challenges" USING btree ("challenge","type","user_id");--> statement-breakpoint
CREATE INDEX "idx_webauthn_challenges_expires_at" ON "webauthn_challenges" USING btree ("expires_at");
