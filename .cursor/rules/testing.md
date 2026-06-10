# Testing Rules

## Coverage gate (required)

- Run `npm run test:coverage` before completing any code change.
- **Minimum: 90%** lines, statements, and functions on the scope defined in `vitest.config.ts`.
- Do not merge if thresholds fail. Add tests instead of lowering thresholds.

## Test layers

Place new tests in the correct folder:

| Layer | Path | Examples |
|-------|------|------------|
| Unit | `src/test/unit/` | AES-GCM, vault unlock, WebAuthn PRF prep, validation, API client |
| Security | `src/test/security/` | Plaintext rejection, schema, AAD, sentinel phrase, boundaries |
| Services | `src/test/services/` | letter/vault/passkey/trusted-device/admin services |
| API | `src/test/api/` | Route handlers (`/api/letters`, `/api/passkeys`, `/api/vault`, …) |
| Features | `src/test/features/` | `unlock-with-passkey`, client orchestration |
| E2E | `e2e/` | Register → login → write → list → edit → sign out |

Use unit/service/API tests for most coverage. Reserve E2E for end-to-end smoke of critical flows.

## Required security tests

1. API rejects plaintext title/body on create.
2. Database has no plaintext title/body columns or values.
3. Admin APIs do not return plaintext letter content.
4. Deleted letters removed from active storage.
5. Revoked trusted devices cannot unlock vault.
6. Recovery code not stored in plaintext.
7. Logs do not include private letter content.
8. Default titles encrypted before storage.
9. Answered status queryable as open metadata.
10. New-device unlock requires valid recovery method.
11. Frontend does not import database clients.
12. Letter persistence goes through API endpoints.
13. PostgreSQL migrations generated.

### IndexedDB (when touching device storage or vault unlock)

- Device secret must be a **non-extractable** `CryptoKey`, never base64/raw bytes in IndexedDB.
- Only **encrypted** vault envelopes may be persisted locally.
- Sign out must call `clearVaultClientState()`.
- Trusted device labels use `getDeviceDisplayInfo()`; store `devicePublicKey.deviceId` for “This device” matching.
- See `src/test/security/indexeddb-storage.test.ts` and `SECURITY.md` browser storage section.

### Passkey & recovery (when touching those areas)

- PRF salt derivation stable per user (`passkey-prf.test.ts`).
- WebAuthn JSON options convert PRF salts to `ArrayBuffer` before browser calls (`prepare-webauthn-options.test.ts`).
- Passkey register/authenticate/remove covered in service + API tests.
- Recovery envelope storage uses KDF metadata, not plaintext code.
- Recovery entropy: mathematical test in `recovery-code.test.ts` (not word-count only).

### P1 beta gates (required before real beta)

- Runtime sentinel integration: `sentinel-runtime-integration.test.ts`
- Rate limit abstraction: `rate-limit.test.ts`
- Account deletion: `account-service.test.ts`, `account-route.test.ts`
- Audit redaction: `audit-sanitization.test.ts`
- WebAuthn challenges: `webauthn-challenge-hardening.test.ts`
- Vault auto-lock: `vault-session.test.ts`
- Threat model / LGPD / backup docs in `/docs`

- AAD mismatch rejection: `aad-validation.test.ts`, `aad-verify.test.ts`, letter service tests.
- Transaction rollback: mock `runInTransaction` in `setup.ts`; service tests pass `tx` client.
- Trusted device revocation unlock: `trusted-device-revocation-unlock.test.ts`, `trusted-device-state.test.ts`.

## Sentinel phrase test

Create letter with: `SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345`

Verify phrase absent from: database, API responses, logs, admin endpoints.

## Documentation

When adding tests or changing what is covered, update `README.md` Testing section and `AGENTS.md` if workflow or thresholds change.
