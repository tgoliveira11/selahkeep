import { createUserVaultKey } from "@tgoliveira/vault-core";
import {
  generateRecoveryPhrase,
  type RecoveryPhraseLength,
} from "@/lib/crypto-client/recovery-phrase";
import {
  wrapVaultKeyForPassword,
  wrapVaultKeyForRecoveryPhrase,
} from "@/lib/crypto-client/vault-envelope";

export const VAULT_FIXTURE_USER_ID = "00000000-0000-4000-8000-000000000001";

const fixtureResource = {
  userId: VAULT_FIXTURE_USER_ID,
  resourceId: VAULT_FIXTURE_USER_ID,
};

export type PasswordVaultFixture = Awaited<ReturnType<typeof buildPasswordVaultFixture>>;
export type RecoveryPhraseVaultFixture = Awaited<
  ReturnType<typeof buildRecoveryPhraseVaultFixture>
>;

async function buildPasswordVaultFixture() {
  const vaultKey = await createUserVaultKey();
  const password = "fixture-vault-password-stable";
  const wrapped = await wrapVaultKeyForPassword(vaultKey, password, fixtureResource);
  return { vaultKey, password, ...wrapped };
}

async function buildRecoveryPhraseVaultFixture(wordCount: RecoveryPhraseLength = 12) {
  const vaultKey = await createUserVaultKey();
  const phrase = generateRecoveryPhrase(wordCount);
  const wrapped = await wrapVaultKeyForRecoveryPhrase(vaultKey, phrase, fixtureResource);
  return { vaultKey, phrase, ...wrapped };
}

let passwordFixturePromise: Promise<PasswordVaultFixture> | null = null;
let recoveryPhraseFixturePromise: Promise<RecoveryPhraseVaultFixture> | null = null;

export function loadPasswordVaultFixture(): Promise<PasswordVaultFixture> {
  passwordFixturePromise ??= buildPasswordVaultFixture();
  return passwordFixturePromise;
}

export function loadRecoveryPhraseVaultFixture(
  wordCount: RecoveryPhraseLength = 12
): Promise<RecoveryPhraseVaultFixture> {
  recoveryPhraseFixturePromise ??= buildRecoveryPhraseVaultFixture(wordCount);
  return recoveryPhraseFixturePromise;
}
