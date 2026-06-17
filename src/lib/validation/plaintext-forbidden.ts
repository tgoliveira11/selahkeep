const PLAINTEXT_FORBIDDEN_FIELDS = [
  "title",
  "body",
  "content",
  "message",
  "plaintextTitle",
  "plaintextBody",
  "decryptedContent",
] as const;

export function rejectPlaintextFields(body: Record<string, unknown>): string | null {
  for (const field of PLAINTEXT_FORBIDDEN_FIELDS) {
    if (field in body && body[field] !== undefined) {
      return `Plaintext field '${field}' is not allowed`;
    }
  }
  return null;
}
