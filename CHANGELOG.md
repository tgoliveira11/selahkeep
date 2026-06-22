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

- **Notes-list screen aligned to the high-fidelity mockups.**
  - **Sidebar Library** now mirrors the mockup — **All notes / Pinned / Resolved / Archive** are deep-linked filtered views (`/notes?view=pinned|resolved|archived`); the notes page reads the `view` param and applies the matching smart filter. Account footer keeps Account + Vault + sign out. The sidebar hides while the vault is locked so the unlock screen is full-bleed.
  - **Empty state** matches the mockup: a sparkle tile, "A quiet, empty page", and "Write your first note" (full-bleed, card-less). `EmptyState` gained optional `icon` / `plain` props.
  - **Loading state** is now a shimmering **skeleton card grid** (`NotesSkeletonGrid`) instead of a spinner.
  - **Error state** is the mockup's centered card — "We couldn't reach your vault" with a reassuring note and Try again — shown in place of the list.
  - The notes-list counter now appends the pinned count ("N notes · M pinned") to match the mockup header.
- **Global chrome and detail screens aligned to the Stillness mockup.**
  - **Desktop left sidebar** — on `md+`, authenticated users get a full-height sidebar (`AppSidebar`): brand, a New note CTA, the primary destinations (All notes / Vault / Account) and an account footer with sign out. The horizontal header nav, brand and desktop sign-out moved into it; the header is now the top bar that hosts the vault dock. `SiteShell` lays out sidebar + content column.
  - **Mobile bottom navigation** — a fixed tab bar (Notes / Vault / Account) on small screens, authenticated-only, hidden on `md+`. New `MobileBottomNav` mounted in `SiteShell`.
  - **Vault locked screen** restyled to the mockup's centered hero — large rounded lock tile, calm copy, full-width unlock CTA — and rendered card-less for the notes-list variant.
  - **Expanded vault dock (unlocked)** redesigned with a live **circular countdown ring**, "Vault open / Auto-locks in mm:ss", a **Stay unlocked 15 min** action (resets the inactivity timer) and **Lock now**. New `useVaultAutoLockFraction` hook drives the ring.
  - **Note detail (reading view)** gained a metadata header — category chip + a resolved/unresolved status badge above the title — matching the mockup; tags remain in the metadata row below.
  - **Zen reading mode** — a distraction-free reading surface (large type, title + body only, "Exit zen") reachable from a new Zen action on the note detail page.
  - **Desktop right rail on note detail** (`lg+`) — a Details card (Created / Updated), the version-history panel, and **Duplicate / Archive / Delete** actions move into a right column beside the reading body (delete still routes through the confirm dialog); stacked on smaller screens.
  - **Version history** rows restyled to numbered tiles with status subtitles (Comparing / Created / Edited) and a compact Restore control.
- **Editor refined to the mockup.** The top bar reads "Back to notes" and now offers **Discard** alongside Save; the right-rail template picker is presented as a titled **"Start from a template"** card. (Dictate states — ready/loading/recording/review — already match.)
- **Editor desktop right rail.** On `lg+`, `/notes/new` becomes a two-column layout: the main column holds the title, category, body, attachments and tags, while a right rail holds the template picker, prompt cards, the Dictate panel and an encryption reassurance. Implemented with CSS `grid-template-areas`, so the single-column DOM order (title → category → template → body → attachments → tags) — and the field-order contract — is unchanged; the rail simply spans the right column on wide screens and sits inline above the body on mobile.
- **Note editor redesigned to the Stillness mockup.** The create (`/notes/new`) and edit (`/notes/[id]`) editors now use a **top action bar** — a back affordance, an inline autosave status indicator (“Draft saved” / “Unsaved changes” / “Saving…” / “Offline — saved on device” / “Save failed”), the focus-mode toggle, and the primary **Save** button — replacing the bottom button row. The title is now a large **borderless** input at the top of the form, and the create-note field order follows the mockup: **title → category → template → editor → attachments → tags**. Submission is also available via ⌘/Ctrl+Enter in the editor. Docs: `NOTE_CREATE_EDIT_UX.md`; tests updated (`notes-new-field-order`).

### Fixed

- Fixed the test-suite heap OOM (`Ineffective mark-compacts near heap limit`) at its root: several feature tests mocked `useVaultIndex` with `vi.fn(() => ({...}))`, returning a new object every render, which made the notes page's `useEffect(..., [index])` re-run every render — an infinite render loop that exhausted the worker. The mocks now return a stable reference; un-quarantined `notes-refinements.test.tsx`; added a global Testing Library `cleanup()` in the setup. The full suite now runs green in a single `vitest run` (254 files, 1420 tests). See `docs/KNOWN_ISSUES.md`.
- Note-card date footer now shows the updated date (the created date remains on the note detail page), matching the design spec; updated the corresponding test.

### Added

- **Product-quality refinement pass.** Normalized note create/edit field order (template → category → title → editor → attachments → tags); encrypted attachments with client-side encryption, allowlist, env limits, and storage usage on vault settings; note list excerpts after unlock; autosave UI states including offline; dictation status labels and vault-lock transcript clear; SelahKeep “pause and keep” home copy. Docs: `NOTE_CREATE_EDIT_UX.md`, `AUTOSAVE_BEHAVIOR.md`, `ENCRYPTED_ATTACHMENTS.md`, `DICTATION_UX.md`, `STORAGE_USAGE.md`. Migration `0013_note_attachments.sql`.
- Adopted a formal **design system ("Stillness")** from the visual proposal in `docs/design/`, documented in `docs/DESIGN_SYSTEM.md`. The app now uses the **Schibsted Grotesk** typeface (self-hosted via `next/font`, CSP-safe), a tighter radius, outlined category/tag chips, refined primary/danger buttons, a GitHub-style diff using dedicated add/removed tokens, and signature calm animations.
- Full **light + dark theme** via `prefers-color-scheme`, driven by an expanded CSS design-token set in `src/app/globals.css` (style with tokens only). Agent directives (`AGENTS.md`, `.cursor/rules/ui.md`) and docs (`UI_UX_DIRECTION.md`, `ARCHITECTURE.md`, docs index) now point to the design system as the source of truth for tokens, type, and components.

### Changed

- Note create/edit UX: attachments between editor and tags; dictation control moved into editor section; edit mode separates category (template-locked when applicable) from tags; autosave status shows offline/draft states without premature “Saved”.
- Logged-out home page copy updated for SelahKeep positioning (reflection, prayer, journaling, remembrance).
- Markdown preview uses `breaks: true` (single newlines render as line breaks) with sanitization preserved.

### Security

- Encrypted attachments: client-only encryption under Note Key; server stores ciphertext + byte counts only; executable types blocked client-side; plaintext attachment fields rejected on API.

- Voice dictation is now **near real-time**. Instead of waiting for the recording to finish, audio is captured continuously and the accumulated buffer is re-transcribed on-device every ~2.5s, showing a live transcript while you speak; a final pass runs on Stop. Everything still runs locally — no audio or transcript leaves the device.
- Voice capture now runs on a dedicated **AudioWorklet** (`/worklets/audio-capture-worklet.js`) on the audio thread instead of the deprecated main-thread `ScriptProcessor`, for glitch-free capture while transcription runs.
- The speech model is now **pre-warmed in the background** when an authenticated user enters the app (during browser idle time), so the first dictation no longer waits on the one-time model download/initialization. The Whisper worker is an app-wide singleton reused by the dictation panel. Warm-up is skipped when voice is disabled, the browser lacks support, or the connection is data-saver/2g.
- The **Dictate** button now shows model status: a subtle **green** indicator (and green border) once the speech model is fully loaded, and a **hover tooltip with the current download percentage** while it is still warming up — so you can see how close it is to instant transcription.
- Live dictation feedback improved: partial transcripts refresh faster (~1.5s) and the live preview now shows a clear "transcribing…" activity state so there is always visible feedback while speaking.

### Added

- **Encrypted note version history.** Each time a note's content is saved, an immutable, client-encrypted snapshot is appended to a new `note_versions` table. From a note's detail page you can browse previous versions, **compare any two versions in a GitHub-style line diff** (the diff updates automatically as you pick versions, defaulting to the previous version vs the current note), and **restore** a previous version (restore appends a new version, so history is never rewritten). Snapshots reuse the note's existing Note Key and are AAD-bound to a unique version id; nothing is ever sent or stored in plaintext. Retention is configurable via `NOTE_VERSION_HISTORY_LIMIT` (default 50 per note); older versions are pruned server-side on row counts only. New routes: `GET/POST /api/notes/:id/versions`, `GET /api/notes/:id/versions/:versionId`. Migration `0012_note_versions.sql`. See [`docs/TDR_Note_Version_History.md`](docs/TDR_Note_Version_History.md) and ADR-005.
- **Voice notes with on-device transcription.** A new **Dictate** control on `/notes/new` **and when editing an existing note** records the microphone and transcribes speech to text **entirely on the device** using Whisper via transformers.js (WASM/WebGPU, run in a Web Worker). Supports **English, Portuguese, and Spanish**. The audio and the transcript never leave the browser — only model weights are fetched (once, then cached). The transcript is reviewed/edited by the user and inserted into the normal encrypted-note editor. Feature flag `NEXT_PUBLIC_VOICE_NOTES_ENABLED`; model selectable via `NEXT_PUBLIC_VOICE_MODEL` / `NEXT_PUBLIC_VOICE_MODEL_HOST`. See [`docs/TDR_Local_Voice_Notes.md`](docs/TDR_Local_Voice_Notes.md).

### Fixed

- Note version endpoints (`/api/notes/:id/versions`) no longer return **500** when the `note_versions` table has not been migrated yet (e.g. production before `npm run db:migrate`). The list now degrades to an empty history, single-version fetch maps to 404, and version creation returns a benign **503** that the client already ignores. **The correct fix is still to run migration `0012_note_versions.sql`** on the database; this only prevents the missing table from breaking the note page.

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
