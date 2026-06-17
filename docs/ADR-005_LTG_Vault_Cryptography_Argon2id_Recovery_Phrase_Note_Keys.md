# ADR-005 — LTG Vault Cryptography (Argon2id, Recovery Phrase, Note Keys)

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Supersedes** | Partial updates to ADR-001/002 for LTG vault password + recovery phrase paths |
| **Related** | `docs/TDR_LTG_Vault_MVP.md`, Phase 1 implementation plan |

---

## 1. Context

LTG Vault separates **account authentication** (`@tgoliveira/secure-auth`) from **vault unlock**. The vault is protected by a dedicated vault password/passphrase and a recovery phrase. The User Vault Key (UVK) encrypts note content (Phase 2+). Phase 1 establishes UVK lifecycle, password and recovery phrase envelopes, encrypted vault settings/index placeholders, and a no-plaintext API contract.

Legacy users may still have `vault-v1` trusted-device + 17-word recovery **code** envelopes. New setup uses `vault-v2` with Argon2id-only KDFs and 12/24-word BIP39 recovery **phrases**.

---

## 2. Argon2id (vault password + recovery phrase KDF)

### Library

**`hash-wasm`** (`argon2id` export) — already a project dependency, runs Argon2id in the browser via WebAssembly, audited usage pattern from existing recovery-code path.

**Why not PBKDF2 for new vault paths:** PBKDF2 is weaker against GPU attacks at comparable iteration counts. LTG Vault vault password KDF is **Argon2id only** with **no silent fallback**.

Legacy `recovery_code` envelopes may still use PBKDF2 metadata from pre-Phase-1 clients; new `password` and `recovery_phrase` envelopes must use Argon2id.

### Parameters (default `kdf-v1`)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Algorithm | Argon2id | RFC 9106 |
| Memory (`memorySize`) | 65536 KiB (64 MiB) | Tuned for modern desktop/mobile browsers |
| Iterations | 3 | Time cost |
| Parallelism | 1 | Web Crypto / single-tab UX |
| Salt length | 16 bytes | CSPRNG per envelope |
| Output length | 32 bytes | Imported as AES-256-GCM key |
| Password normalization | NFKC UTF-8 bytes | Vault password and recovery phrase |

### Storage

KDF parameters are stored in `vault_envelopes.kdf_metadata` (JSON):

```json
{
  "kdf": "argon2id",
  "version": "kdf-v1",
  "salt": "<base64url>",
  "memory": 65536,
  "iterations": 3,
  "parallelism": 1
}
```

### Upgrades

Future `kdf-v2` may increase memory/iterations. Clients read `version` + parameters from envelope metadata and re-derive locally. UVK rotation (re-wrap) is a separate operational flow (future ADR).

### Browser / mobile performance

64 MiB Argon2id may be slow on low-memory mobile browsers. Setup and unlock show a calm progress state. If Argon2id becomes unavailable, the client **fails closed** — no PBKDF2 downgrade for vault password or recovery phrase.

Implementation: `src/lib/crypto-client/argon2id.ts`, `src/lib/crypto-client/vault-kdf.ts`.

---

## 3. User Vault Key (UVK)

| Property | Decision |
|----------|----------|
| Generation | `crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])` |
| Entropy | 256-bit AES key material from CSPRNG |
| Lifetime in memory | Session only via `vault-session.ts`; cleared on lock, logout (`clearVaultClientState`), tab close guard |
| Wrapping | AES-GCM envelopes with keys derived from vault password or recovery phrase |
| Server | Never transmitted; only encrypted envelopes stored |
| Note Keys (Phase 2+) | Per-note AES keys wrapped by UVK — not implemented in Phase 1 except type placeholders |

---

## 4. Unlock envelopes

| Type | Phase | Method string | Purpose |
|------|-------|---------------|---------|
| `password` | **1 — implement** | `password` | Vault password/passphrase unwraps UVK |
| `recovery_phrase` | **1 — implement** | `recovery_phrase` | Recovery phrase unwraps UVK |
| `passkey_prf` | **4 — document only** | `passkey_prf` | PRF-derived key unwraps UVK |
| `trusted_device` | legacy | `trusted_device` | Device secret unwraps UVK |
| `recovery_code` | legacy | `recovery_code` | 17-word legacy code |
| `passkey_authorized_device` | legacy/4 | `passkey_authorized_device` | Passkey PRF envelope |

Phase 1 creates exactly one `password` and one `recovery_phrase` envelope at setup.

---

## 5. Recovery phrase

### Wordlist

**BIP39 English wordlist** (2048 words) via `@scure/bip39/wordlists/english` — industry-standard mnemonic source, documented in Bitcoin BIP-0039.

Not the legacy 17-word custom hyphenated recovery **code** wordlist.

### Length choice

User selects **12 words** (128-bit entropy) or **24 words** (256-bit entropy) at setup.

### Generation

Client-side CSPRNG → BIP39 mnemonic (`generateMnemonic`).

### Confirmation UX

User must re-enter all words (or select from shuffled grid) before envelopes are created. Phrase is shown once with explicit copy/save guidance.

### Recovery semantics

The recovery phrase **restores access to the vault** (unwraps UVK). It does **not** recover the original vault password string. Copy must say “recover access to your vault,” not “recover your password.”

### Transport

Recovery phrase never sent to server, never logged, never stored in DB.

Implementation: `src/lib/crypto-client/recovery-phrase.ts`.

---

## 6. Encrypted payload format (`enc-v1`)

Unchanged core from ADR-001:

```json
{
  "version": "enc-v1",
  "alg": "AES-GCM",
  "iv": "<base64url 12 bytes>",
  "ciphertext": "<base64url>",
  "aad": {
    "userId": "<uuid>",
    "resourceId": "<uuid>",
    "field": "vault_key | vault_settings | vault_index | title | body | letter_key"
  }
}
```

- **Encryption:** AES-256-GCM
- **IV/nonce:** 12 bytes random per encryption
- **AAD:** Canonical JSON string binding `userId`, `resourceId`, `field`
- **Versioning:** `enc-v1` on payload; `vault-v2` on vault row

### Vault settings blob (client-encrypted)

Opaque JSON encrypted under UVK at setup, e.g. `{ setupVersion: 1, recoveryPhraseLength: 12 | 24 }`. Server stores ciphertext only in `user_vaults.encrypted_vault_settings`.

### Vault index placeholder (client-encrypted)

Empty encrypted structure for Phase 2 note index. Stored in `user_vaults.encrypted_vault_index`.

---

## 7. No-plaintext API contract

### APIs may receive

- `encryptedVaultSettings`, `encryptedVaultIndex`
- `encryptedVaultKey` (envelope ciphertext)
- `kdfMetadata` / `kdf_params`
- `publicMetadata`, envelope `method`
- `vaultVersion`, technical IDs, timestamps

### APIs must not receive

- `vaultPassword`, `password` (vault context), `recoveryPhrase`, `recoveryWords`
- `userVaultKey`, `noteKey`
- Plaintext `title`, `body`, `content`, `tags`, `category`
- Passkey PRF output

Validation: `rejectVaultPlaintextFields()` in `src/lib/validation/vault.ts`.

---

## 8. Consequences

- New vaults use `vault-v2` + `password` + `recovery_phrase` envelopes.
- Legacy `vault-v1` flows remain until migrated.
- Phase 4 implements `passkey_prf` envelope per ADR-002 evolution.
- Phase 2 adds Note Keys wrapped by UVK.

```text
TODO_SECURITY_REVIEW_REQUIRED:
Production migration from vault-v1 + recovery_code to vault-v2 + recovery_phrase requires a human-reviewed data migration plan before bulk user conversion.
```
