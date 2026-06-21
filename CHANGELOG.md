# Changelog

All notable changes to SelahKeep will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where applicable.

## Changelog policy

- Document user-visible fixes, security-relevant behavior, and breaking changes under `[Unreleased]` until release.
- Group entries under `Added`, `Changed`, `Fixed`, `Security`, or `Removed` as appropriate.
- Link to ADRs or audit docs when behavior is security-sensitive.
- Do not log secrets, credentials, or decrypted content in changelog entries.

## [Unreleased]

### Changed

- Voice dictation is now **near real-time**. Instead of waiting for the recording to finish, audio is captured continuously and the accumulated buffer is re-transcribed on-device every ~2.5s, showing a live transcript while you speak; a final pass runs on Stop. Everything still runs locally — no audio or transcript leaves the device.
- Voice capture now runs on a dedicated **AudioWorklet** (`/worklets/audio-capture-worklet.js`) on the audio thread instead of the deprecated main-thread `ScriptProcessor`, for glitch-free capture while transcription runs.
- The speech model is now **pre-warmed in the background** when an authenticated user enters the app (during browser idle time), so the first dictation no longer waits on the one-time model download/initialization. The Whisper worker is an app-wide singleton reused by the dictation panel. Warm-up is skipped when voice is disabled, the browser lacks support, or the connection is data-saver/2g.

### Added

- **Encrypted note version history.** Each time a note's content is saved, an immutable, client-encrypted snapshot is appended to a new `note_versions` table. From a note's detail page you can browse previous versions, **compare any two versions in a GitHub-style line diff** (the diff updates automatically as you pick versions, defaulting to the previous version vs the current note), and **restore** a previous version (restore appends a new version, so history is never rewritten). Snapshots reuse the note's existing Note Key and are AAD-bound to a unique version id; nothing is ever sent or stored in plaintext. Retention is configurable via `NOTE_VERSION_HISTORY_LIMIT` (default 50 per note); older versions are pruned server-side on row counts only. New routes: `GET/POST /api/notes/:id/versions`, `GET /api/notes/:id/versions/:versionId`. Migration `0012_note_versions.sql`. See [`docs/TDR_Note_Version_History.md`](docs/TDR_Note_Version_History.md) and ADR-005.
- **Voice notes with on-device transcription.** A new **Dictate** control on `/notes/new` **and when editing an existing note** records the microphone and transcribes speech to text **entirely on the device** using Whisper via transformers.js (WASM/WebGPU, run in a Web Worker). Supports **English, Portuguese, and Spanish**. The audio and the transcript never leave the browser — only model weights are fetched (once, then cached). The transcript is reviewed/edited by the user and inserted into the normal encrypted-note editor. Feature flag `NEXT_PUBLIC_VOICE_NOTES_ENABLED`; model selectable via `NEXT_PUBLIC_VOICE_MODEL` / `NEXT_PUBLIC_VOICE_MODEL_HOST`. See [`docs/TDR_Local_Voice_Notes.md`](docs/TDR_Local_Voice_Notes.md).

### Security

- Hardened HTTP security headers following a security/privacy audit: added **HSTS** (`Strict-Transport-Security`, 2y, preload) and a **Permissions-Policy** (`microphone=(self)`; camera/geolocation/payment/usb disabled). Extended the existing nonce-based **CSP** with `worker-src 'self' blob:` and a tightened `connect-src` that allows only `'self'` plus the on-device voice model host(s) — the self-hosted `NEXT_PUBLIC_VOICE_MODEL_HOST` when set, otherwise the default model CDNs. (Previously `connect-src 'self'` would have blocked the voice model download in production.)
- Voice transcription can now run **fully first-party**: setting `NEXT_PUBLIC_VOICE_MODEL_HOST` serves both the model weights and the ONNX-runtime WASM from that host, and scopes `connect-src` to it. The voice panel now discloses the one-time model download.
- Broadened server log redaction to also mask `noteKey`, `userVaultKey`, `recoveryPhrase`, `recoveryWords`, `mnemonic`, and `prf` keys (defense-in-depth; these are client-only and never sent to the server).
- Documented the web-delivery trust assumption, the extractable in-memory session keys, and the metadata the server can still observe under E2EE (note/version counts, timestamps, payload sizes) in `SECURITY.md` and the threat model; corrected the threat model to state Argon2id-only for new vault envelopes (PBKDF2 only in legacy `recovery_code`).
- Note version snapshots are encrypted client-side under the note's Note Key with per-version AAD binding (`note_version_metadata` / `note_version_body` bound to the version id; wrapped key bound to the note id), preventing cross-version/cross-note ciphertext swaps. Version content is readable only while the vault is unlocked; versions cascade-delete with the note and on account deletion. Sentinel-phrase and schema guards extended to `note_versions`.
- Voice transcription runs only on-device. The browser cloud Web Speech API is explicitly **not** used for note content (it would stream audio to a third party). Audio is held in memory and released after transcription; it is never persisted. A guard test asserts the voice modules perform no `fetch`/XHR/WebSocket/`sendBeacon` of audio or transcript and never reference `webkitSpeechRecognition`.

### Changed

- Simplified the Vault Dock so it shows only one primary unlock method. Passkey unlock is prioritized when configured; otherwise the dock uses vault password unlock. Recovery phrase unlock is now available only on the full unlock page.
- Reduced the Vault Dock width and removed the setup-vault state from the dock. The dock is hidden before a vault exists and on `/vault/unlock`.

### Added

- Added recovery phrase `.txt` download during vault setup.
- Added randomized recovery phrase confirmation challenges during vault setup: 3 words for 12-word phrases and 6 words for 24-word phrases.

### Fixed

- Fixed vault passkey unlock when both account sign-in passkeys and vault unlock passkeys exist. Vault unlock now requests only vault-enabled passkey credentials via `POST /api/passkeys/authenticate` with `purpose: "vault_unlock"`, and no longer allows account-only passkeys to be selected during vault unlock.
- Fixed vault passkey unlock option shaping so vault unlock preserves WebAuthn transport hints and requests only vault-enabled credentials. This prevents account-only passkeys from being offered during vault unlock and reduces incorrect QR-code / phone-or-tablet prompts when a local platform vault passkey is available.
- Fixed vault passkey registration to prefer platform authenticators (`authenticatorAttachment: "platform"`) for vault-only setup, improving Touch ID / Windows Hello prompts on macOS and other platforms.
- Fixed Apple passkey replacement when account and vault passkeys are registered for the same SelahKeep account. Vault-only credentials now use a deterministic opaque WebAuthn user handle distinct from the account passkey user handle, preventing a later account passkey registration from replacing the local Touch ID vault credential. Vault passkeys created before this fix may need to be removed and registered again once after unlocking with the vault password.
- Fixed vault passkey setup reporting `Internal server error` after the passkey and PRF envelope had already been persisted successfully. A failure while refreshing the status panel is now shown as a non-destructive refresh warning and no longer misreports registration as failed.
- Fixed production WebAuthn registration verification on the canonical `https://www.selahkeep.com` origin. `APP_BASE_URL` and `WEBAUTHN_ORIGIN` now match the Vercel domain redirect while `WEBAUTHN_RP_ID` remains `selahkeep.com`, so vault and account passkey ceremonies are verified on the host users actually visit.
- Fixed vault passkey re-registration after disable. Vault-only disable now revokes the credential row and PRF envelope; vault registration `excludeCredentials` excludes only active vault-enabled credentials, not account-only or disabled vault credentials.

### Security

- Reinforced the separation between account passkeys and vault passkeys. Account passkeys authenticate the account; vault passkeys unlock the vault using WebAuthn PRF. Account passkey sign-in still never unlocks the vault by itself. Vault unlock verify rejects account-only credentials and never returns a successful verify with a null envelope for vault unlock purpose.
- Reinforced account passkey and vault passkey separation. Vault unlock continues to require WebAuthn PRF and fails closed if the selected credential is not linked to vault unlock.
- Documented vault passkey lifecycle (registration, disable, re-registration) in `docs/PASSKEY_VAULT_LIFECYCLE.md`.
- Reinforced recovery phrase handling by keeping phrase download and confirmation fully client-side and by requiring randomized word-position confirmation before completing setup.
