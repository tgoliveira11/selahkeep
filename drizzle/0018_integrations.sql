CREATE TABLE IF NOT EXISTS "integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'mcp',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_integrations_user_id" ON "integrations" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "token_prefix" text NOT NULL,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "integration_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_integration_tokens_integration_id" ON "integration_tokens" ("integration_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id") ON DELETE CASCADE,
  "resource_type" text NOT NULL,
  "resource_id" uuid NOT NULL,
  "encrypted_wrapped_key" jsonb NOT NULL,
  "permissions" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_grants_active_unique"
  ON "integration_grants" ("integration_id", "resource_type", "resource_id")
  WHERE "revoked_at" IS NULL;
