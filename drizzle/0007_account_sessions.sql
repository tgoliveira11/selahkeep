CREATE TABLE IF NOT EXISTS "account_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "auth_method" text NOT NULL,
  "browser" text,
  "platform" text,
  "device_type" text,
  "ip_hash" text,
  "ip_masked" text,
  "user_agent_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_account_sessions_user_id_revoked_at"
  ON "account_sessions" ("user_id", "revoked_at");

CREATE INDEX IF NOT EXISTS "idx_account_sessions_user_id_last_used_at"
  ON "account_sessions" ("user_id", "last_used_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_account_sessions_id_user_id"
  ON "account_sessions" ("id", "user_id");

ALTER TABLE "user_two_factor_login_tokens"
  ADD COLUMN IF NOT EXISTS "auth_method" text;
