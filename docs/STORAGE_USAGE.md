# Storage usage — SelahKeep

## What is counted

Server-side **encrypted ciphertext** sizes only:

- Note payloads: metadata + body + wrapped note key JSON sizes
- Attachments: sum of `ciphertext_bytes` per attachment

## What is not counted

- Decrypted plaintext size on device
- Local encrypted drafts (IndexedDB)
- Voice model cache

## Limits

`MAX_TOTAL_STORAGE_MB` (default 100) applies to combined note + attachment ciphertext per vault.

## UI

- **Vault settings** (`/vault/settings`): primary storage card
- Label clarifies ciphertext-only measurement; `partial` flag reserved for future index-only estimates

## API

`GET /api/vault/storage-usage` → `{ notesCiphertextBytes, attachmentsCiphertextBytes, totalCiphertextBytes, maxBytes, partial }`

See `docs/ENCRYPTED_ATTACHMENTS.md`.
