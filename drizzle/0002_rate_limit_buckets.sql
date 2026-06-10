CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "bucket_key" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL DEFAULT 1,
  "reset_at" timestamp with time zone NOT NULL
);
