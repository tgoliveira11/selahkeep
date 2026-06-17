import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "@tgoliveira/secure-auth/drizzle/schema";

/** Product extension: vault unlock columns are not in package passkeyCredentials. */
export const passkeyCredentials = pgTable("passkey_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: text("counter").notNull().default("0"),
  transports: jsonb("transports"),
  friendlyName: text("friendly_name"),
  signInEnabled: boolean("sign_in_enabled").notNull().default(true),
  vaultUnlockEnabled: boolean("vault_unlock_enabled").notNull().default(false),
  prfSupported: boolean("prf_supported"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const userVaults = pgTable("user_vaults", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  vaultVersion: text("vault_version").notNull(),
  encryptedVaultSettings: jsonb("encrypted_vault_settings"),
  encryptedVaultIndex: jsonb("encrypted_vault_index"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vaultEnvelopes = pgTable(
  "vault_envelopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    encryptedVaultKey: jsonb("encrypted_vault_key").notNull(),
    kdfMetadata: jsonb("kdf_metadata"),
    publicMetadata: jsonb("public_metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("idx_vault_envelopes_user_id_method").on(table.userId, table.method)]
);

export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientDeviceId: text("client_device_id"),
    deviceName: text("device_name").notNull(),
    devicePublicKey: jsonb("device_public_key"),
    browser: text("browser"),
    platform: text("platform"),
    deviceType: text("device_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_trusted_devices_user_id").on(table.userId),
    index("idx_trusted_devices_user_client_device_id").on(table.userId, table.clientDeviceId),
  ]
);

export const letters = pgTable(
  "letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedTitle: jsonb("encrypted_title").notNull(),
    encryptedBody: jsonb("encrypted_body").notNull(),
    encryptedLetterKey: jsonb("encrypted_letter_key").notNull(),
    encryptionVersion: text("encryption_version").notNull(),
    answered: boolean("answered").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_letters_user_id_created_at").on(table.userId, table.createdAt),
    index("idx_letters_user_id_answered").on(table.userId, table.answered),
  ]
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => userVaults.id, { onDelete: "cascade" }),
    encryptedMetadata: jsonb("encrypted_metadata").notNull(),
    encryptedWrappedNoteKey: jsonb("encrypted_wrapped_note_key").notNull(),
    encryptedBody: jsonb("encrypted_body").notNull(),
    bodyEncryptionVersion: text("body_encryption_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("idx_notes_vault_id_created_at").on(table.vaultId, table.createdAt)]
);

export type Letter = typeof letters.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type VaultEnvelope = typeof vaultEnvelopes.$inferSelect;
