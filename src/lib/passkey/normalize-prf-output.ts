import { base64UrlToBytes } from "@/lib/crypto-client/encoding";

/** Copy the first 32 PRF bytes for AES-256 `importKey("raw", …)`. */
export function prfBytesForAes256Import(prfOutput: Uint8Array): Uint8Array<ArrayBuffer> {
  if (prfOutput.byteLength < 32) {
    throw new Error("PRF output must be at least 32 bytes");
  }
  const keyBytes = new Uint8Array(32);
  keyBytes.set(prfOutput.subarray(0, 32));
  return keyBytes as Uint8Array<ArrayBuffer>;
}

/** Coerce WebAuthn PRF extension bytes to a Uint8Array (no length normalization). */
export function coerceExtensionBytesToUint8Array(value: unknown): Uint8Array | null {
  if (value == null) return null;

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }

  if (typeof value === "string") {
    try {
      return base64UrlToBytes(value);
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    if (value.length < 32 || value.some((entry) => typeof entry !== "number")) {
      return null;
    }
    return new Uint8Array(value);
  }

  return null;
}

function pickPrfResultFirst(results: unknown, credentialId?: string): unknown {
  if (!results || typeof results !== "object") return null;
  const record = results as Record<string, unknown>;

  if (record.first != null) {
    return record.first;
  }

  if (credentialId && record[credentialId] != null) {
    const perCredential = record[credentialId];
    if (perCredential && typeof perCredential === "object" && "first" in perCredential) {
      return (perCredential as { first?: unknown }).first ?? null;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && "first" in value) {
      const first = (value as { first?: unknown }).first;
      if (first != null) return first;
    }
  }

  return null;
}

/**
 * Read PRF `results.first` from WebAuthn client extension output.
 * Handles `eval` (`results.first`) and `evalByCredential` (per-credential map) shapes.
 */
export function extractNormalizedPasskeyPrfOutput(
  clientExtensionResults: Record<string, unknown>,
  credentialId?: string
): Uint8Array | null {
  const prf = clientExtensionResults.prf;
  if (!prf || typeof prf !== "object") return null;

  const results = (prf as { results?: unknown }).results;
  const first = pickPrfResultFirst(results, credentialId);
  const bytes = coerceExtensionBytesToUint8Array(first);
  if (!bytes || bytes.byteLength < 32) return null;

  return prfBytesForAes256Import(bytes);
}
