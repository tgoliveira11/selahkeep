# Changelog

All notable changes to SelahKeep will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where applicable.

## Changelog policy

- Document user-visible fixes, security-relevant behavior, and breaking changes under `[Unreleased]` until release.
- Group entries under `Added`, `Changed`, `Fixed`, `Security`, or `Removed` as appropriate.
- Link to ADRs or audit docs when behavior is security-sensitive.
- Do not log secrets, credentials, or decrypted content in changelog entries.

## [Unreleased]

### Fixed

- Fixed vault passkey unlock when both account sign-in passkeys and vault unlock passkeys exist. Vault unlock now requests only vault-enabled passkey credentials via `POST /api/passkeys/authenticate` with `purpose: "vault_unlock"`, and no longer allows account-only passkeys to be selected during vault unlock.
- Fixed vault passkey unlock option shaping so vault unlock preserves WebAuthn transport hints and requests only vault-enabled credentials. This prevents account-only passkeys from being offered during vault unlock and reduces incorrect QR-code / phone-or-tablet prompts when a local platform vault passkey is available.
- Fixed vault passkey registration to prefer platform authenticators (`authenticatorAttachment: "platform"`) for vault-only setup, improving Touch ID / Windows Hello prompts on macOS and other platforms.
- Fixed Apple passkey replacement when account and vault passkeys are registered for the same SelahKeep account. Vault-only credentials now use a deterministic opaque WebAuthn user handle distinct from the account passkey user handle, preventing a later account passkey registration from replacing the local Touch ID vault credential. Vault passkeys created before this fix may need to be removed and registered again once after unlocking with the vault password.
- Fixed vault passkey setup reporting `Internal server error` after the passkey and PRF envelope had already been persisted successfully. A failure while refreshing the status panel is now shown as a non-destructive refresh warning and no longer misreports registration as failed.
- Fixed vault passkey re-registration after disable. Vault-only disable now revokes the credential row and PRF envelope; vault registration `excludeCredentials` excludes only active vault-enabled credentials, not account-only or disabled vault credentials.

### Security

- Reinforced the separation between account passkeys and vault passkeys. Account passkeys authenticate the account; vault passkeys unlock the vault using WebAuthn PRF. Account passkey sign-in still never unlocks the vault by itself. Vault unlock verify rejects account-only credentials and never returns a successful verify with a null envelope for vault unlock purpose.
- Reinforced account passkey and vault passkey separation. Vault unlock continues to require WebAuthn PRF and fails closed if the selected credential is not linked to vault unlock.
- Documented vault passkey lifecycle (registration, disable, re-registration) in `docs/PASSKEY_VAULT_LIFECYCLE.md`.
