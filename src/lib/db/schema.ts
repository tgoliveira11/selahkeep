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
  trustedDevices,
  letters,
  type Letter,
  type TrustedDevice,
  type VaultEnvelope,
} from "./app-schema";

import { users } from "@tgoliveira/secure-auth/drizzle/schema";

export type User = typeof users.$inferSelect;
