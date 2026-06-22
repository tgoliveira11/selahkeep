export {
  users,
  accountSessions,
  accountTokens,
  auditEvents,
  rateLimitBuckets,
  userTwoFactorBackupCodes,
  userTwoFactorLoginChallenges,
  userTwoFactorLoginTokens,
  userTwoFactorSessionUpgrades,
  userTwoFactorSettings,
  webauthnChallenges,
} from "@tgoliveira/secure-auth/drizzle/schema";

export {
  passkeyCredentials,
  userVaults,
  vaultEnvelopes,
  notes,
  noteVersions,
  noteAttachments,
  type Note,
  type NoteVersion,
  type NoteAttachment,
  type VaultEnvelope,
} from "./app-schema";

import { users } from "@tgoliveira/secure-auth/drizzle/schema";

export type User = typeof users.$inferSelect;
