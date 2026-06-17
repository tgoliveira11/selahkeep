import { stringToBytes } from "./encoding";
import {
  DEFAULT_ARGON2ID_PARAMS,
  deriveArgon2idAesKey,
  deriveArgon2idAesKeyFromMetadata,
  serializeArgon2idMetadata,
  type Argon2idKdfMetadata,
} from "./argon2id";

/** Normalize vault password for KDF input (NFKC). */
export function normalizeVaultPassword(password: string): Uint8Array {
  return stringToBytes(password.normalize("NFKC"));
}

export async function deriveVaultPasswordKey(
  vaultPassword: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; metadata: Argon2idKdfMetadata }> {
  const saltBytes = salt ?? crypto.getRandomValues(new Uint8Array(DEFAULT_ARGON2ID_PARAMS.saltLength));
  const passwordBytes = normalizeVaultPassword(vaultPassword);
  const key = await deriveArgon2idAesKey(passwordBytes, saltBytes);
  return {
    key,
    metadata: serializeArgon2idMetadata(saltBytes),
  };
}

export async function deriveVaultPasswordKeyFromMetadata(
  vaultPassword: string,
  metadata: Argon2idKdfMetadata
): Promise<CryptoKey> {
  return deriveArgon2idAesKeyFromMetadata(normalizeVaultPassword(vaultPassword), metadata);
}
