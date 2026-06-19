export {
  encryptedPayloadSchema,
  argon2idKdfMetadataSchema,
  kdfMetadataSchema,
  storedEnvelopeSchema,
  type EncryptedPayload,
  type EncryptedVaultPayload,
  type Argon2idKdfMetadata,
  type KdfMetadata,
  type VaultEnvelopeMethod,
  type StoredEnvelope,
  type VaultEnvelope,
  type PasswordEnvelope,
  type RecoveryPhraseEnvelope,
  type PasskeyPrfEnvelope,
  type RecoveryPhraseWordCount,
  type VaultCryptoVersion,
  type VaultCryptoProfile,
} from "@tgoliveira/vault-core";

export type { VaultClientStatus } from "@tgoliveira/vault-core/react";
