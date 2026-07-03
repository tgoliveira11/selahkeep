# Cryptography Rules (ADR-005)

- Follow `docs/ADR-005_LTG_Vault_Cryptography_Argon2id_Recovery_Phrase_Note_Keys.md` and `docs/archive/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md`.
- Do not implement from superseded letters-era ADRs when they conflict with ADR-005/006.
- Argon2id only for vault password and recovery phrase KDF on new paths.
- Per-note keys wrapped by User Vault Key; encrypted metadata includes title, category, tags, answered.
- Encrypted vault index for list/search metadata — no plaintext title/category/tag at rest.
- AAD binds `userId`, `resourceId`, `field`, `encryptionVersion`.
- Passkey PRF output never leaves the browser.
