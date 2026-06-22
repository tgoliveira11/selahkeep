import { readIntEnv } from "@/lib/env/parse";

export const DEFAULT_MAX_ATTACHMENT_SIZE_MB = 10;
export const DEFAULT_MAX_ATTACHMENTS_PER_NOTE = 10;
export const DEFAULT_MAX_TOTAL_STORAGE_MB = 100;

/** Max plaintext file size per attachment (MB). */
export function getMaxAttachmentSizeMb(env: NodeJS.ProcessEnv = process.env): number {
  return readIntEnv(env, "MAX_ATTACHMENT_SIZE_MB", DEFAULT_MAX_ATTACHMENT_SIZE_MB, {
    min: 1,
    max: 50,
  });
}

/** Max attachments per note. */
export function getMaxAttachmentsPerNote(env: NodeJS.ProcessEnv = process.env): number {
  return readIntEnv(env, "MAX_ATTACHMENTS_PER_NOTE", DEFAULT_MAX_ATTACHMENTS_PER_NOTE, {
    min: 1,
    max: 50,
  });
}

/** Max total encrypted storage per vault (MB) — notes + attachments ciphertext. */
export function getMaxTotalStorageMb(env: NodeJS.ProcessEnv = process.env): number {
  return readIntEnv(env, "MAX_TOTAL_STORAGE_MB", DEFAULT_MAX_TOTAL_STORAGE_MB, {
    min: 10,
    max: 10_000,
  });
}

export function getMaxAttachmentSizeBytes(env: NodeJS.ProcessEnv = process.env): number {
  return getMaxAttachmentSizeMb(env) * 1024 * 1024;
}

export function getMaxTotalStorageBytes(env: NodeJS.ProcessEnv = process.env): number {
  return getMaxTotalStorageMb(env) * 1024 * 1024;
}
