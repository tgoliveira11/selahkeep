# Security Rules

- Encrypt private letter title/body on client before API calls.
- Reject plaintext fields: `title`, `body`, `content`, `message`, `plaintextTitle`, `plaintextBody`, `decryptedContent`.
- Never log plaintext letter content, keys, or recovery codes.
- Never store User Vault Key in plaintext on backend or in localStorage.
- No Server Actions for private letter persistence.
- No frontend database imports.
- No AI APIs for private letter content.
- No admin endpoints returning letter content.
- **AAD binding:** validate `aad.userId`, `aad.resourceId`, `aad.field` server-side before storage; client verifies before decrypt.
- **Recovery codes:** ≥128 bits entropy; client-generated; never stored plaintext; Argon2id KDF (PBKDF2-SHA-256 fallback with versioned metadata).
- **Trusted device revocation:** revoke envelope with device; client must check server device status before unlock; clear IndexedDB on revoke.
- **Transactions:** vault init, device create/revoke, recovery code, passkey register/remove must use `runInTransaction()`.
- Mark uncertain crypto with `TODO_SECURITY_REVIEW_REQUIRED`.
