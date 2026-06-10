# Security Rules

- Encrypt private letter title/body on client before API calls.
- Reject plaintext fields: `title`, `body`, `content`, `message`, `plaintextTitle`, `plaintextBody`, `decryptedContent`.
- Never log plaintext letter content, keys, or recovery codes.
- Never store User Vault Key in plaintext on backend or in localStorage.
- No Server Actions for private letter persistence.
- No frontend database imports.
- No AI APIs for private letter content.
- No admin endpoints returning letter content.
- Mark uncertain crypto with `TODO_SECURITY_REVIEW_REQUIRED`.
