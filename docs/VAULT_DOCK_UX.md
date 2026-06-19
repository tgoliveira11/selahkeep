# SelahKeep — Vault Dock UX

**Product:** SelahKeep  
**Status:** Implemented

---

## Purpose

The Vault Dock is a compact, persistent vault status control below the main app nav for users who already have a configured vault.

It is **not** a vault setup surface and **not** a full unlock page.

---

## Visibility

| State | Dock visible? |
|-------|----------------|
| No vault configured | No |
| Setup incomplete | No |
| Locked vault (configured) | Yes (collapsed handle; expandable) |
| Unlocked vault | Yes |
| `/vault/unlock` | No (full unlock page owns unlock UI) |

Page-level empty/setup guidance handles vault creation on routes such as `/notes`, `/vault/settings`, and `/vault/security`.

---

## One primary unlock method (locked)

When the vault is locked, the expanded dock shows **exactly one** primary unlock method:

### Vault passkey configured

- Primary: **Unlock with passkey**
- No vault password field in the dock
- No recovery phrase in the dock
- Secondary link: **More unlock options** → `/vault/unlock?returnTo=[current path + query]`

If passkey is configured but PRF is unavailable in this browser:

- Message: *Passkey unlock is unavailable in this browser.*
- Link: **Open full unlock page**
- No silent fallback to password inside the dock

### No vault passkey configured

- Primary: **Vault password** + **Unlock vault**
- No recovery phrase in the dock
- Secondary link: **More unlock options**

---

## Recovery phrase

Recovery phrase unlock is available **only** on `/vault/unlock`.

The dock never offers recovery phrase unlock.

---

## Return navigation

Dock links preserve the current internal route:

```text
/vault/unlock?returnTo=%2Fnotes%2Fabc%3Fview%3Dfull
```

`returnTo` is sanitized server-side and client-side. External URLs are rejected. Missing/unsafe values default to `/notes` after unlock.

---

## Layout

- Centered below authenticated header
- Reduced width: `max-width: 26.25rem` (~420px)
- Responsive on mobile with safe margins
- Collapsible handle + expanded panel

---

## Related docs

- `docs/VAULT_SETUP_RECOVERY_PHRASE_CONFIRMATION.md`
- `SECURITY.md`
