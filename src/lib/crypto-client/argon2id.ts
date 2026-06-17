import { argon2id } from "hash-wasm";
import type { KdfMetadata } from "@/lib/validation/encrypted-payload";
import { bytesToBase64Url, base64UrlToBytes, toBufferSource } from "./encoding";

/** Default Argon2id parameters for SelahKeep vault (ADR-005). */
export const DEFAULT_ARGON2ID_PARAMS = {
  memory: 65536,
  iterations: 3,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
} as const;

export type Argon2idParams = typeof DEFAULT_ARGON2ID_PARAMS;

export type Argon2idKdfMetadata = Extract<KdfMetadata, { kdf: "argon2id" }>;

export function serializeArgon2idMetadata(
  salt: Uint8Array,
  params: Pick<Argon2idParams, "memory" | "iterations" | "parallelism"> = DEFAULT_ARGON2ID_PARAMS
): Argon2idKdfMetadata {
  return {
    kdf: "argon2id",
    version: "kdf-v1",
    salt: bytesToBase64Url(salt),
    memory: params.memory,
    iterations: params.iterations,
    parallelism: params.parallelism,
  };
}

export function parseArgon2idMetadata(metadata: Argon2idKdfMetadata): {
  salt: Uint8Array;
  memory: number;
  iterations: number;
  parallelism: number;
} {
  return {
    salt: base64UrlToBytes(metadata.salt),
    memory: metadata.memory,
    iterations: metadata.iterations,
    parallelism: metadata.parallelism,
  };
}

export async function deriveArgon2idAesKey(
  passwordBytes: Uint8Array,
  salt: Uint8Array,
  params: {
    memory: number;
    iterations: number;
    parallelism: number;
    hashLength?: number;
  } = DEFAULT_ARGON2ID_PARAMS
): Promise<CryptoKey> {
  const hashLength = params.hashLength ?? DEFAULT_ARGON2ID_PARAMS.hashLength;
  const hash = await argon2id({
    password: passwordBytes,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memory,
    hashLength,
    outputType: "binary",
  });

  return crypto.subtle.importKey(
    "raw",
    toBufferSource(new Uint8Array(hash)),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function deriveArgon2idAesKeyFromMetadata(
  passwordBytes: Uint8Array,
  metadata: Argon2idKdfMetadata
): Promise<CryptoKey> {
  const { salt, memory, iterations, parallelism } = parseArgon2idMetadata(metadata);
  return deriveArgon2idAesKey(passwordBytes, salt, {
    memory,
    iterations,
    parallelism,
    hashLength: DEFAULT_ARGON2ID_PARAMS.hashLength,
  });
}
