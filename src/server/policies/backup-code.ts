import { createHash, randomBytes } from "node:crypto";
import { TwoFactorEncryptionKeyError } from "@/server/policies/two-factor-secret-crypto";

const BACKUP_CODE_GROUPS = 3;
const BACKUP_CODE_GROUP_LENGTH = 4;

export function generateBackupCodes(count: number): string[] {
  return Array.from({ length: count }, () => generateBackupCode());
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

export function hashBackupCode(code: string): string {
  const pepper = process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY;
  if (!pepper) {
    throw new TwoFactorEncryptionKeyError();
  }
  const normalized = normalizeBackupCode(code);
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

function generateBackupCode(): string {
  const bytes = randomBytes(BACKUP_CODE_GROUPS * 2);
  const hex = bytes.toString("hex").toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < BACKUP_CODE_GROUPS; i++) {
    groups.push(hex.slice(i * BACKUP_CODE_GROUP_LENGTH, (i + 1) * BACKUP_CODE_GROUP_LENGTH));
  }
  return groups.join("-");
}
