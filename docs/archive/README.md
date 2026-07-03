# Archived documentation

These documents are **obsolete** and kept for historical context only.

The single source of truth for vault and passkey PRF unlock behavior is the
`@tgoliveira/vault-core` package:

- `node_modules/@tgoliveira/vault-core/README.md`
- `node_modules/@tgoliveira/vault-core/docs/IMPLEMENTATION_GUIDE.md`
- `node_modules/@tgoliveira/vault-core/PASSKEY_PRF_ENVELOPES.md`

## Why these were archived (2026-07-03)

The passkey vault-unlock docs below described an app-side ceremony layer
(transport juggling, `evalByCredential`, capability probing, Touch-ID/QR
handling, dual-passkey lifecycle) that accreted on top of vault-core and became
the source of repeated regressions. The project is realigning so that vault-core
alone determines vault and passkey unlock behavior.

| Archived doc | Original role |
|--------------|---------------|
| `ADR-006_LTG_Vault_Passkey_PRF_Unlock.md` | Passkey PRF vault unlock ADR |
| `PASSKEY_LOGIN_VAULT_UNLOCK.md` | Passkey login vs vault unlock separation |
| `PASSKEY_TOUCH_ID_QR_PROMPT_FIX.md` | Touch ID vs QR prompt fix record |
| `PASSKEY_VAULT_LIFECYCLE.md` | Vault passkey register/unlock/disable lifecycle |
| `PASSKEY_VAULT_SETUP_AVAILABILITY_AUDIT.md` | Vault settings availability audit |
| `PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md` | PRF diagnostics audit |
