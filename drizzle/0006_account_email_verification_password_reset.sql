ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "password_updated_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "account_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "email" text,
  "type" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_account_tokens_user_id_type"
  ON "account_tokens" ("user_id", "type");

CREATE INDEX IF NOT EXISTS "idx_account_tokens_expires_at"
  ON "account_tokens" ("expires_at");
