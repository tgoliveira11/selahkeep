const SENSITIVE_KEYS = new Set([
  "title",
  "body",
  "content",
  "message",
  "plaintextTitle",
  "plaintextBody",
  "decryptedContent",
  "encryptedTitle",
  "encryptedBody",
  "encryptedLetterKey",
  "encryptedVaultKey",
  "recoveryCode",
  "vaultKey",
  "letterKey",
  "password",
]);

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) {
    return "[REDACTED]";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>);
  }
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = redactValue(key, value);
  }
  return result;
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta) return "";
  return JSON.stringify(redactObject(meta));
}

export const safeLogger = {
  info(message: string, meta?: Record<string, unknown>): void {
    const formatted = formatMeta(meta);
    console.log(formatted ? `${message} ${formatted}` : message);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    const formatted = formatMeta(meta);
    console.warn(formatted ? `${message} ${formatted}` : message);
  },
  error(message: string, meta?: Record<string, unknown>): void {
    const formatted = formatMeta(meta);
    console.error(formatted ? `${message} ${formatted}` : message);
  },
};
