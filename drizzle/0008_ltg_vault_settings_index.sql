ALTER TABLE "user_vaults" ADD COLUMN IF NOT EXISTS "encrypted_vault_settings" jsonb;
ALTER TABLE "user_vaults" ADD COLUMN IF NOT EXISTS "encrypted_vault_index" jsonb;
