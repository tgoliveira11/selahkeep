# Cryptography Rules (ADR-001)

- AES-GCM, 256-bit keys, 96-bit IV per operation.
- Structured payloads: `version`, `alg`, `iv`, `ciphertext`, `aad`.
- AAD fields: `userId`, `resourceId`, `field`.
- Letter Key per letter; encrypted by User Vault Key.
- Recovery code: ≥128 bits entropy, Argon2id KDF (PBKDF2 fallback with versioned metadata).
- Passkeys must not be raw encryption keys (ADR-002).
- IV reuse forbidden.
- Uncertain choices require `TODO_SECURITY_REVIEW_REQUIRED`.
