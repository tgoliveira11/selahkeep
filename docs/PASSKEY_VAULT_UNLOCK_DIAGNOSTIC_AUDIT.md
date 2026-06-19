# Passkey Vault Unlock — Diagnostic Audit

**Date:** 2026-06-17  
**Product:** SelahKeep  
**Scope:** Passkey **vault unlock** (PRF envelope) — not account passkey sign-in (`@tgoliveira/secure-auth`)

---

## 1. Current setup / status locations

| Area | Path | Role |
|------|------|------|
| Vault settings UX | `/vault/settings` → `PasskeyVaultUnlockSetup` | Primary management: set up, test, replace, disable |
| Recovery page | `/vault/recovery` | Recovery phrase focus; link to vault settings for passkey |
| Vault unlock | `/vault/unlock` → `LtgVaultUnlockPanel` | Unlock with passkey when `passkey_authorized_device` envelope exists |
| Enable envelope | `POST /api/account/passkeys/:id/enable-vault-unlock` | Options + verify; requires `prfVaultEnvelope: true` |
| Vault unlock status | `GET /api/account/passkeys/:id/vault-unlock` | Per-credential `vaultUnlockEnabled`, `prfSupported` |
| Unlock ceremony | `POST /api/passkeys/authenticate` | Standalone vault unlock (locked vault, signed-in session) |
| Crypto unwrap | `src/lib/crypto-client/passkey-vault.ts` | PRF → AES key → decrypt UVK envelope |
| PRF extension builder | `src/lib/passkey/prf.ts` | `passkeyPrfAuthExtensions`, salt per `userId` |
| Server envelope store | `passkey-vault-envelope-service.ts` | Creates `passkey_authorized_device` with `prfRequired: true` |
| Vault status | `GET /api/vault/status` | `hasPasskey`, `availableUnlockMethods.passkey` |

---

## 2. PRF detection logic

### Pre-ceremony (best-effort)

`detectPasskeyPrfSupport()` in `src/lib/passkey/prf-support.ts`:

1. `isPasskeySupported()` — `window.PublicKeyCredential` defined
2. If `PublicKeyCredential.getClientCapabilities` missing → **`unknown`**
3. If `capabilities["extension:prf"] === true` → **`supported`**
4. If `capabilities["extension:prf"] === false` → **`unknown`** (probe can lie; try ceremony)
5. Otherwise → **`unknown`**

UI affordances use `isPrfExtensionSupported()` — optimistic when WebAuthn exposes
`getClientExtensionResults`; only false when WebAuthn is unavailable.

Consolidated in `src/lib/passkey/passkey-prf-diagnostics.ts`:

- `probePasskeyPrfEnvironment()` / `probePasskeyPrfEnvironmentAsync()`
- `shouldBlockPasskeyVaultSetupBeforeCeremony()` — blocks only on secure-context failure or WebAuthn missing
- **`unknown` does not block** — user may attempt setup

### Post-ceremony (source of truth)

`extractPasskeyPrfOutput()` reads `clientExtensionResults.prf.results.first` (≥ 32 bytes).

Envelope is created **only** when PRF output is present client-side and `prfVaultEnvelope: true` is sent. Server rejects verify without `prfVaultEnvelope`.

---

## 3. When “unsupported” messaging is shown

| Trigger | Reason code | User-facing headline |
|---------|-------------|----------------------|
| `!window.isSecureContext` | `secure_context_required` | Secure connection required |
| No `PublicKeyCredential` / `navigator.credentials` | `webauthn_unavailable` | WebAuthn not available |
| `getClientCapabilities()["extension:prf"] === false` | (informational only) | Recorded in diagnostics; setup **not** blocked — try ceremony |
| Ceremony dismissed (`NotAllowedError`) | `ceremony_cancelled` | Passkey ceremony cancelled |
| Ceremony OK but no PRF in results | `prf_not_returned` | Passkey did not return PRF output |
| Capability probe inconclusive | `unknown` | PRF support could not be confirmed (informational; setup allowed) |

**Removed vague copy:** former Alert title `"Passkey unlock not available here"` replaced with diagnostic headlines from `getPasskeyPrfDiagnosticHeadline()`.

---

## 4. `getClientCapabilities` vs `getClientExtensionResults().prf`

| Probe | When | Trust level |
|-------|------|-------------|
| `getClientCapabilities()["extension:prf"]` | Before ceremony | Hint only; `false` or `missing` ≠ unsupported |
| `clientExtensionResults.prf` after WebAuthn | After ceremony | **Authoritative** for envelope create/unwrap |

SelahKeep never creates a `passkey_prf` / `passkey_authorized_device` envelope without post-ceremony PRF output.

---

## 5. Brave / macOS / localhost behavior

| Environment | Typical behavior |
|-------------|------------------|
| **localhost** | Secure context (`isSecureContext === true`); WebAuthn works for dev |
| **Brave macOS** | May omit `getClientCapabilities` or report `extension:prf` inconsistently → probe returns **`unknown`**; user can try setup; outcome depends on ceremony PRF |
| **Safari** | Often lacks PRF → ceremony returns no PRF → `prf_not_returned` |
| **Chrome + platform passkey** | Often `supported` pre-check and PRF in ceremony |

Structured PRF diagnostics drive user-facing messages on `/vault/settings` and unlock flows. They never log PRF bytes or UVK.

---

## 6. secure-auth APIs used (account passkey login only)

From `@tgoliveira/secure-auth/client`:

| API | Used for |
|-----|----------|
| `passkeyAccountApi.list()` | List account passkeys in vault settings |
| Package passkey login routes | Account sign-in only (`/api/auth/passkey/login/*`) |

Vault unlock enable/disable uses **product routes** (`/api/account/passkeys/:id/enable-vault-unlock`, `vault-unlock`). secure-auth is **not** modified.

---

## 7. Root cause: former “Passkey unlock not available here”

**Location:** `src/features/recovery/passkey-setup.tsx` (legacy recovery CTA; now de-emphasized).

**Root cause:** A single `prf-unavailable` outcome mapped to a generic Alert title regardless of:

1. Pre-ceremony block when `detectPasskeyPrfSupport() === "unsupported"` (explicit capability denial)
2. Post-ceremony missing PRF (provider/browser lacks PRF despite registration completing)
3. User cancellation vs true unsupported

Users on browsers with **unknown** capability were already allowed to try; the confusing message appeared mainly after failed ceremonies or explicit `unsupported` probes, with no distinction between causes.

**Fix:** Structured `PasskeyPrfDiagnosticReason` + per-reason copy; primary UX moved to `/vault/settings`; recovery page links to settings instead of primary passkey CTA.

---

## 8. Security invariants (unchanged)

- PRF output and UVK never sent to API
- `prfVaultEnvelope: true` required server-side
- No non-PRF passkey vault envelopes
- Account session ≠ vault unlock

---

## 9. Test coverage map

| File | Scenarios |
|------|-----------|
| `passkey-prf-diagnostics.test.ts` | Environment probe, blocking rules, messages, ceremony resolution |
| `passkey-vault-unlock-settings.test.tsx` | Settings states, setup/test/disable, unknown vs unsupported |
| `passkey-setup.test.tsx` | Registration ceremony, diagnostic messages (updated) |
| `vault-recovery-page.test.tsx` | Recovery phrase focus, settings link |
| `unlock-with-passkey.test.ts` | PRF-required unlock errors |
| `vault-status-ui.test.tsx` | Unlock panel passkey visibility |
