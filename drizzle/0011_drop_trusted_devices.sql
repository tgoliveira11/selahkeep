-- Remove trusted-device vault unlock: envelopes first, then table and indexes.
DELETE FROM "vault_envelopes" WHERE "method" = 'trusted_device';

DROP INDEX IF EXISTS "idx_trusted_devices_active_user_client_device_id";
DROP INDEX IF EXISTS "idx_trusted_devices_user_client_device_id";
DROP INDEX IF EXISTS "idx_trusted_devices_user_id";

DROP TABLE IF EXISTS "trusted_devices";
