# SelahKeep — `@tgoliveira/vault-core@0.2.0` update assessment

**Date:** 2026-06-16  
**Product:** SelahKeep (`letters-to-god` repo)  
**Outcome:** **Implemented** (update with code changes)

---

## 1. Versions

| Item | Value |
| --- | --- |
| Previous installed (`package.json`) | `^0.1.1` |
| Previous lockfile resolution | `0.1.1` |
| Target | `0.2.0` |
| Post-update lockfile | `0.2.0` |

Verified with `npm ls @tgoliveira/vault-core`.

---

## 2. Official documentation inspected

| Source | Location |
| --- | --- |
| `CHANGELOG.md` | `/Users/thiago.oliveira/Projects/vault-core/CHANGELOG.md` (local clone); npm package `0.2.0` |
| `API_REFERENCE.md` | vault-core repo root |
| `docs/ADOPTING_VAULT_CORE_IN_EXISTING_APPS.md` | vault-core repo |
| `docs/IMPLEMENTATION_GUIDE.md` | vault-core repo (referenced) |
| `README.md` | vault-core repo |
| Published `dist/*.d.ts` | `node_modules/@tgoliveira/vault-core@0.2.0` |

No separate `MIGRATION_FROM_0.1_TO_0.2.md` file exists. **0.2.0 migration guidance is in `CHANGELOG.md` §0.2.0 and `API_REFERENCE.md` / adoption guide import mapping.**

---

## 3. Import paths in SelahKeep (pre-update inventory)

| Entry point | Usage |
| --- | --- |
| `@tgoliveira/vault-core` | Envelopes, UVK, recovery, legacy decrypt helpers, profile types |
| `@tgoliveira/vault-core/browser` | **Only** `src/lib/crypto-client/vault-passkey-browser.ts` (PRF helpers + salt; no session state) |
| `@tgoliveira/vault-core/react` | Type-only: `VaultClientStatus` in `src/modules/vault/core/types.ts` |
| `@tgoliveira/vault-core/testing` | Not used |

`@tgoliveira/core-vault`: **not present** (verified with `rg`).

---

## 4. Official migration instructions (0.1.x → 0.2.0)

From `CHANGELOG.md` [0.2.0]:

1. **Breaking:** High-level payload decrypt and envelope unlock APIs require **expected AAD scope** and **`VaultCryptoProfile`**.
2. **Breaking:** Direct session-key mutation helpers are **no longer exported** from `@tgoliveira/vault-core/browser` (session API remains via `configureVaultSession`, `unlockVaultSession`, etc.).
3. **Breaking:** Recovery word confirmation requires **every** expected answer (SelahKeep uses full-phrase `assertRecoveryPhraseConfirmation` only; word-index confirmation not used in UI).

From `ADOPTING_VAULT_CORE_IN_EXISTING_APPS.md` §6 (confirmed for 0.2.0):

- `unlockWithPasswordEnvelope(password, envelope, expectedScope, profile)`
- `unlockWithRecoveryEnvelope(phrase, envelope, expectedScope, profile, options?)`
- `unlockWithPasskeyPrfEnvelope(envelope, prfOutput, expectedScope, profile, options?)`
- Legacy envelopes **without** `aad.context` must use a **local compatibility path**; high-level APIs reject missing context.

---

## 5. Breaking changes and SelahKeep impact

| Change | SelahKeep affected? | Mitigation |
| --- | --- | --- |
| Envelope unlock requires `expectedScope` + profile | **Yes** | Pass `scope` + `SELAHKEEP_VAULT_PROFILE` in envelope wrappers |
| `decryptVaultPayload` requires scope + profile | **No** (app uses local `encryptField` for notes/index/settings) | N/A |
| Browser entry drops `setSessionVaultKey` / `lockVault` exports | **No** | App session owned by `src/lib/crypto-client/vault-session.ts` |
| Recovery word confirmation strictness | **No** | UI does not use partial word confirmation |
| Stricter envelope Zod schemas | **Low** | Existing DB shapes already match v2 methods |
| AAD assert on high-level decrypt | **Yes** for new envelopes | `legacy-envelope-unlock.ts` for pre-profile / null context |

---

## 6. Deprecated / renamed APIs

| 0.1.x | 0.2.0 |
| --- | --- |
| `generateRecoveryPhrase` | `createRecoveryPhrase` (alias kept) |
| `wrapVaultKeyForRecoveryPhrase` (core) | `createRecoveryEnvelope` |
| `wrapVaultKeyForPasskey` (core) | `createPasskeyPrfEnvelope` |
| `unlockVaultFromPasskeyEnvelope` (core) | `unlockWithPasskeyPrfEnvelope` (alias kept) |

SelahKeep keeps **app-local** wrapper names (`wrapVaultKeyForPassword`, etc.) delegating to vault-core.

---

## 7. Impact matrix

| Current SelahKeep usage | 0.2.0 status | Required change | Risk |
| --- | --- | --- | --- |
| `createPasswordEnvelope` + profile on wrap | Compatible | None | Low |
| `unlockWithPasswordEnvelope` | Signature changed | Add `scope`, `SELAHKEEP_VAULT_PROFILE` | Medium |
| `createRecoveryEnvelope` / unlock | Signature changed on unlock | Add scope + profile on unlock | Medium |
| `createPasskeyPrfEnvelope` / unwrap | Signature changed on unwrap/unlock | Add scope + profile | Medium |
| Legacy null/missing `aad.context` envelopes | Rejected by core | Keep `legacy-envelope-unlock.ts` | High if removed |
| `vault-passkey-browser.ts` PRF imports | Compatible | None | Low |
| Local `vault-session.ts` | Independent of core browser session | None | Low |
| Note/index/settings crypto (app-local) | Unchanged | None | Low |
| `recovery-code.ts` (vault-v1) | Not in vault-core | Keep app-local | N/A |

---

## 8. Session / browser boundary

**Required rule preserved:** all in-memory UVK state flows through `src/lib/crypto-client/vault-session.ts`.

- `@tgoliveira/vault-core/browser` imported only from `vault-passkey-browser.ts`.
- UI, notes, vault pages, server modules do **not** import browser entry.
- 0.2.0 removal of direct session-key setters **aligns** with SelahKeep’s single-source design.

Tests: `src/test/security/vault-session-single-source.test.ts`, `vault-core-boundaries.test.ts`.

---

## 9. Compatibility / security test coverage

Existing suites cover password/recovery/passkey unlock, legacy envelopes, session after manual lock, plaintext rejection, account/vault separation, and boundary imports. Added `src/test/unit/vault-core-version.test.ts` for dependency version assertions.

---

## 10. Recommendation

**Update with code changes** — migration steps are documented in vault-core `CHANGELOG` and adoption guide; SelahKeep already has profile, legacy unlock path, and local session boundary. **Not blocked.**

---

## 11. Implementation summary

| Item | Action |
| --- | --- |
| `package.json` / lockfile | Bumped to `@tgoliveira/vault-core@^0.2.0` |
| `password-envelope.ts` | Pass `scope` + `SELAHKEEP_VAULT_PROFILE` to `unlockWithPasswordEnvelope` |
| `recovery-envelope.ts` | Pass `scope` + profile to `unlockWithRecoveryEnvelope` |
| `passkey-prf-envelope.ts` | Pass `scope` + profile to unwrap/unlock core calls |
| `legacy-envelope-unlock.ts` | Retained unchanged |
| `@tgoliveira/secure-auth` | Not modified |
| Database schema | Not changed |
| Existing encrypted records | Not re-encrypted |

---

## 12. Rollback plan

1. Revert `package.json` and `package-lock.json` to `^0.1.1` / `0.1.1`.
2. Revert envelope wrapper signature changes.
3. Run `npm ci`, full test suite, and build.
4. Mark this document outcome as **blocked** if any compatibility test fails.

---

## 13. Remaining risks / TODO_SECURITY_REVIEW

- Mixed production envelopes (with/without `context`) must continue to route through legacy detection; monitor if new setups ever omit context.
- No production golden fixtures in repo yet — legacy tests use envelopes with context stripped from vault-core-created blobs.
- Manual browser verification checklist in migration results doc should be run on staging before production deploy.

No new `TODO_SECURITY_REVIEW_REQUIRED` items from this upgrade.
