import bcrypt from "bcryptjs";

/** bcrypt cost factor for credentials passwords (registration + password updates). */
export const BCRYPT_COST = 12;

/** bcrypt hashes are one-way digests, not reversible ciphertext. */
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function assertPasswordHashFormat(passwordHash: string): void {
  if (!BCRYPT_HASH_PATTERN.test(passwordHash)) {
    throw new Error("password_hash must be a bcrypt digest, never plaintext");
  }
}

export async function hashPassword(plaintext: string): Promise<string> {
  const passwordHash = await bcrypt.hash(plaintext, BCRYPT_COST);
  assertPasswordHashFormat(passwordHash);
  return passwordHash;
}

export async function verifyPassword(plaintext: string, passwordHash: string): Promise<boolean> {
  assertPasswordHashFormat(passwordHash);
  return bcrypt.compare(plaintext, passwordHash);
}
