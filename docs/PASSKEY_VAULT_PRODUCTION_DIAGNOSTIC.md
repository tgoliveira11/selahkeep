# Passkey vault — production diagnostic (pre-consolidation)

**Purpose:** Read-only database checks and a manual production test for `tgoliveira11@gmail.com` on [selahkeep.com](https://www.selahkeep.com) **before** merging the passkey vault consolidation PR.

**Schema source:** `src/lib/db/app-schema.ts`

| Logical name (docs) | Actual table | Notes |
|---------------------|--------------|-------|
| `passkey_credentials` | `passkey_credentials` | Product extension columns: `sign_in_enabled`, `vault_unlock_enabled`, `prf_supported`, `last_used_at` |
| `vault_unlock_envelopes` | `vault_envelopes` | Passkey PRF rows use `method = 'passkey_authorized_device'`; `public_metadata.credentialId` links to `passkey_credentials.credential_id` |

---

## 1. SQL (Neon console — read-only)

Replace the email if checking a different account. All queries are `SELECT` only.

```sql
-- Resolve user (sanity check)
SELECT id, email, created_at
FROM users
WHERE lower(email) = lower('tgoliveira11@gmail.com');

-- 1) All passkeys for the user
SELECT
  pc.id,
  left(pc.credential_id, 12) AS credential_id_prefix,
  pc.sign_in_enabled,
  pc.vault_unlock_enabled,
  pc.prf_supported,
  pc.transports,
  pc.friendly_name,
  (pc.revoked_at IS NOT NULL) AS revoked,
  pc.created_at,
  pc.last_used_at
FROM passkey_credentials pc
JOIN users u ON u.id = pc.user_id
WHERE lower(u.email) = lower('tgoliveira11@gmail.com')
ORDER BY pc.created_at DESC;

-- 2) Count active vault-enabled passkeys (MVP expects exactly 1)
SELECT count(*)::int AS vault_enabled_count
FROM passkey_credentials pc
JOIN users u ON u.id = pc.user_id
WHERE lower(u.email) = lower('tgoliveira11@gmail.com')
  AND pc.vault_unlock_enabled = true
  AND pc.revoked_at IS NULL;

-- 3) All passkey PRF envelopes (active and revoked)
SELECT
  ve.id,
  ve.method,
  ve.public_metadata->>'credentialId' AS credential_id,
  left(ve.public_metadata->>'credentialId', 12) AS credential_id_prefix,
  ve.public_metadata->>'prfRequired' AS prf_required,
  (ve.revoked_at IS NOT NULL) AS revoked,
  ve.created_at
FROM vault_envelopes ve
JOIN users u ON u.id = ve.user_id
WHERE lower(u.email) = lower('tgoliveira11@gmail.com')
  AND ve.method = 'passkey_authorized_device'
ORDER BY ve.created_at DESC;

-- 4) Active envelopes with NO matching active vault-enabled credential (orphan envelope)
SELECT
  ve.id,
  left(ve.public_metadata->>'credentialId', 12) AS credential_id_prefix,
  ve.created_at
FROM vault_envelopes ve
JOIN users u ON u.id = ve.user_id
WHERE lower(u.email) = lower('tgoliveira11@gmail.com')
  AND ve.method = 'passkey_authorized_device'
  AND ve.revoked_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM passkey_credentials pc
    WHERE pc.user_id = ve.user_id
      AND pc.credential_id = ve.public_metadata->>'credentialId'
      AND pc.revoked_at IS NULL
      AND pc.vault_unlock_enabled = true
  );

-- 5) Active vault-enabled credentials with NO active matching envelope (orphan credential)
SELECT
  pc.id,
  left(pc.credential_id, 12) AS credential_id_prefix,
  pc.sign_in_enabled,
  pc.vault_unlock_enabled,
  pc.created_at
FROM passkey_credentials pc
JOIN users u ON u.id = pc.user_id
WHERE lower(u.email) = lower('tgoliveira11@gmail.com')
  AND pc.revoked_at IS NULL
  AND pc.vault_unlock_enabled = true
  AND NOT EXISTS (
    SELECT 1
    FROM vault_envelopes ve
    WHERE ve.user_id = pc.user_id
      AND ve.method = 'passkey_authorized_device'
      AND ve.revoked_at IS NULL
      AND ve.public_metadata->>'credentialId' = pc.credential_id
  );

-- 6) Stale rows: revoked credential still flagged vault_unlock_enabled
SELECT
  pc.id,
  left(pc.credential_id, 12) AS credential_id_prefix,
  pc.vault_unlock_enabled,
  pc.revoked_at
FROM passkey_credentials pc
JOIN users u ON u.id = pc.user_id
WHERE lower(u.email) = lower('tgoliveira11@gmail.com')
  AND pc.revoked_at IS NOT NULL
  AND pc.vault_unlock_enabled = true;
```

---

## 2. Interpretation guide

### Healthy state (ready for consolidation test)

| Check | Good |
|-------|------|
| `vault_enabled_count` | **Exactly 1** |
| Active passkey row | `vault_unlock_enabled = true`, `revoked = false`, `prf_supported = true` (or non-null) |
| Active envelope | One row: `method = passkey_authorized_device`, `revoked = false`, `prf_required = true`, `credential_id_prefix` matches the active passkey |
| Orphan / stale queries (4–6) | **0 rows** each |
| Transports | iPhone/iPad vault passkeys often show `["internal"]` or `["hybrid","internal"]`; Mac may show `["internal"]` or `["hybrid"]` |

### Bad patterns (investigate before merge)

| Pattern | Meaning | Typical symptom |
|---------|---------|-----------------|
| `vault_enabled_count > 1` | Multiple active vault passkeys (pre-consolidation bug / stale rows) | iOS PRF `eval` vs `evalByCredential` mismatch; unlock or Test fails intermittently |
| Orphan envelope (query 4) | Server has active PRF envelope for a credential that is revoked or not vault-enabled | Unlock targets wrong credential; Test may fail with decrypt error |
| Orphan credential (query 5) | DB says vault passkey active but no envelope | Settings shows configured inconsistently; unlock fails “no envelope” |
| Stale revoked + vault_enabled (query 6) | Disable flow did not clear flag | Old rows still listed; may confuse unlock scoping |
| Many revoked rows + one active | Normal after disable/re-setup cycles | OK if exactly one active pair (credential + envelope) remains |
| Account-only passkey (`sign_in_enabled = true`, `vault_unlock_enabled = false`) | Expected when vault uses a **vault-only** passkey | Account sign-in passkey must not unlock vault |

### Local vs production

- `.env.local` `DATABASE_URL` pointing at **localhost** reflects **dev data only**.
- Run the SQL block in the **Neon production** console (or a read-only production connection) for the real pre-merge baseline.

---

## 3. Manual production test — selahkeep.com

**Account:** `tgoliveira11@gmail.com`  
**Settings URL:** `https://www.selahkeep.com/vault/settings`  
**Prerequisite:** Know vault password or recovery phrase (needed to unlock vault for setup if locked).

Perform on **each device class** you care about: **iPhone** and **Mac** (Safari or Chrome). Use the same account.

### A. iPhone (Safari recommended)

1. Sign in to selahkeep.com (account session only — vault may stay locked).
2. Unlock vault with **vault password** or **recovery phrase** if prompted.
3. Open **Vault settings** → **Passkey vault unlock** section.
4. If a passkey is already configured: tap **Disable all** (or **Disable** on the vault passkey) and confirm. Wait for success message.
5. Tap **Set up passkey vault unlock** (or **Set up**). Complete Face ID / Touch ID when prompted.
6. Confirm UI shows passkey vault unlock **enabled** / configured.
7. Tap **Test**. **Must pass** (success message — verify + decrypt round-trip, not PRF probe alone).
8. Lock vault (**Lock now** in vault dock, or navigate away until auto-lock).
9. From locked state, use vault dock **Unlock with passkey**. **Must pass** — vault opens, notes decrypt.

**Record:** Test pass/fail, unlock pass/fail, any error copy shown.

### B. Mac (Safari or Chrome)

Repeat steps 1–9 on desktop. Prefer the browser you use daily.

- If **Set up** fails with “passkey already exists on this device”, remove the stale vault passkey from the system password manager (see §4), then retry **Disable all → Set up**.

### C. Optional regression (account sign-in passkey)

If you use a separate **account** passkey for sign-in (Enpass, iCloud, etc.):

1. Sign out, sign in with account passkey only.
2. Confirm vault stays **locked** until explicit unlock.
3. Confirm account passkey sign-in does **not** replace or break vault passkey unlock configured in step A/B.

---

## 4. iCloud Keychain vs Enpass

| Provider | Account sign-in | Vault unlock (PRF) |
|----------|-----------------|---------------------|
| **iCloud Keychain** (platform passkey on Apple device) | Supported | Supported on **iOS/iPadOS 18+** and recent macOS when PRF is returned in the ceremony |
| **Enpass** (cross-device / hybrid) | Often works for account login | **Unreliable for vault unlock** — may not return PRF output; sign-in can succeed while vault unlock fails |

**Product rule:** Vault passkey unlock requires post-ceremony **PRF output**. Account passkey providers that omit PRF cannot unlock the vault even if sign-in works.

**Vault-only registration** uses a separate WebAuthn user handle so an iCloud account passkey does not overwrite the vault passkey on Apple devices (`docs/PASSKEY_VAULT_LIFECYCLE.md`, ADR-006).

**If Test fails after setup on Enpass:** use vault password/recovery on that browser; configure vault unlock with a **platform** passkey (iCloud Keychain / Touch ID) on iPhone or Mac instead.

---

## 5. What to report back (before consolidation PR)

Copy this checklist into the PR or chat:

```text
### Production diagnostic — tgoliveira11@gmail.com

**SQL (Neon production):**
- vault_enabled_count: ___
- Active passkey: prefix ___ | sign_in ___ | vault_unlock ___ | revoked ___ | transports ___
- Active envelope: yes/no | credential prefix matches passkey: yes/no
- Orphan envelopes: ___
- Orphan credentials: ___
- Stale revoked+vault_enabled: ___

**Manual — iPhone:**
- Disable all → Set up: pass / fail
- Test: pass / fail
- Dock unlock after lock: pass / fail
- Notes: ___

**Manual — Mac:**
- Disable all → Set up: pass / fail
- Test: pass / fail
- Dock unlock after lock: pass / fail
- Notes: ___

**Blockers for consolidation PR:** yes / no — ___
```

**Go / no-go:** Proceed with consolidation PR only when production SQL shows a **single** active credential↔envelope pair (orphan/stale queries empty) **and** iPhone + Mac **Test** and **dock unlock** both pass.

---

## Related docs

- `docs/PASSKEY_VAULT_LIFECYCLE.md` — registration, disable, re-setup
- `docs/ADR-006_LTG_Vault_Passkey_PRF_Unlock.md` — PRF envelope format
- `docs/PASSKEY_VAULT_UNLOCK_DIAGNOSTIC_AUDIT.md` — PRF detection and failure modes
- `CHANGELOG.md` (Unreleased) — iOS PRF parity / consolidation fixes
