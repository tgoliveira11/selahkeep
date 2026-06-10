# Cryptography Rules (ADR-001)

- AES-GCM, 256-bit keys, 96-bit IV per operation.
- Structured payloads: `version`, `alg`, `iv`, `ciphertext`, `aad`.
- AAD fields: `userId`, `resourceId`, `field` — must match authenticated user and persisted resource; validate server-side and client-side.
- Letter Key per letter; encrypted by User Vault Key.
- Recovery code: ≥128 bits entropy (uniform word selection + rejection sampling from a project-specific wordlist — **not BIP39**); dynamic word count from unique wordlist size (currently 17 words / 252 words ≈ 135.6 bits); Argon2id KDF primary; PBKDF2-SHA-256 fallback (600k iterations) with versioned `kdf-v1` metadata.
- Recovery code shown only at generation/regeneration; never stored plaintext.
- Passkeys authenticate identity; PRF output wraps vault key (not signature bytes).
- PRF required for passkey vault envelopes; document browser fallback (recovery/trusted device).
- IV reuse forbidden.
- Uncertain choices require `TODO_SECURITY_REVIEW_REQUIRED`.
