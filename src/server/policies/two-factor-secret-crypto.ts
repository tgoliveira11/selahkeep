import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const TWO_FACTOR_SECRET_PAYLOAD_VERSION = "tf-v1";

export type EncryptedTwoFactorSecret = {
  version: typeof TWO_FACTOR_SECRET_PAYLOAD_VERSION;
  iv: string;
  ciphertext: string;
  tag: string;
};

export class TwoFactorEncryptionKeyError extends Error {
  constructor() {
    super(
      "Two-factor authentication is not configured on this server. Set TWO_FACTOR_SECRET_ENCRYPTION_KEY in .env.local (see .env.example)."
    );
    this.name = "TwoFactorEncryptionKeyError";
  }
}

function getEncryptionKey(): Buffer {
  const raw = process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new TwoFactorEncryptionKeyError();
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptTwoFactorSecret(plaintext: string): EncryptedTwoFactorSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: TWO_FACTOR_SECRET_PAYLOAD_VERSION,
    iv: iv.toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    tag: tag.toString("base64url"),
  };
}

export function decryptTwoFactorSecret(payload: EncryptedTwoFactorSecret): string {
  if (payload.version !== TWO_FACTOR_SECRET_PAYLOAD_VERSION) {
    throw new Error("Unsupported two-factor secret payload version");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
