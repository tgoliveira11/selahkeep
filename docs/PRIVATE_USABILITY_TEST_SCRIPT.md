# LTG Vault — Private Usability Test Script

**Purpose:** Structured private beta usability session before public launch.  
**Duration:** ~60–90 minutes per tester  
**Environment:** Staging with real email (not `EMAIL_PROVIDER=console`)

---

## Before the session

- [ ] Tester has a personal email they can access
- [ ] Staging URL and `APP_BASE_URL` match
- [ ] Vault inactivity lock documented (15 minutes)
- [ ] Observer records issues; do not coach unless tester is blocked >3 minutes
- [ ] Confirm tester understands notes are encrypted and cannot be recovered without vault credentials

---

## Tester profile (record)

| Field | Value |
|-------|-------|
| Date | |
| Device / browser | |
| Passkey capable? | Yes / No |
| Prior vault app experience | |

---

## Flows (15)

Complete in order where possible. Mark: ✅ smooth · ⚠️ friction · ❌ blocked

### 1. First impression (public home)

**Task:** Open the home page without signing in.  
**Observe:** Do they understand LTG Vault vs a generic notes app?  
**Ask:** In one sentence, what is this product for?

### 2. Account registration

**Task:** Create an account with email and password.  
**Observe:** Password policy clarity, verification email (if enabled).

### 3. Email verification (if enabled)

**Task:** Verify email and return to sign in.

### 4. First sign-in

**Task:** Sign in with email and password.  
**Observe:** Redirect to notes or vault setup.

### 5. Vault setup

**Task:** Complete vault setup (vault password + recovery phrase).  
**Observe:** Copy explains account password ≠ vault password.  
**Ask:** How would you recover if you forgot the vault password?

### 6. Write first note

**Task:** Create a note with title, body (Markdown), category, and tag.  
**Observe:** Editor usability on their device; save feedback.

### 7. Notes list and filters

**Task:** Find the note using search and filters.  
**Observe:** Mobile filter layout if on phone.

### 8. Mark as answered

**Task:** Mark the note as answered and confirm badge appears.

### 9. Manual vault lock

**Task:** Lock the vault from navigation.  
**Observe:** Titles hidden; unlock prompt clear.

### 10. Vault unlock (password)

**Task:** Unlock with vault password.  
**Observe:** Note titles reappear.

### 11. Recovery phrase unlock (optional)

**Task:** Lock vault; unlock with recovery phrase (use copy from setup).  
**Skip if:** Tester uncomfortable handling phrase during session.

### 12. Passkey vault unlock (optional)

**Task:** Enable passkey vault unlock in account settings; lock and unlock with passkey.  
**Skip if:** Browser/device does not support PRF.

### 13. Vault settings

**Task:** Open `/vault/settings`; read import/export notice; change unlock behavior.  
**Ask:** Do you understand what “metadata only” vs “decrypt all” means?

### 14. Inactivity lock

**Task:** Unlock vault; remain idle >15 minutes (or ask operator to shorten timer in dev).  
**Observe:** Calm banner: “Your vault was locked to protect your private notes.”

### 15. Sign out

**Task:** Sign out from navigation.  
**Observe:** Vault locked; no decrypted content visible after re-open without unlock.

---

## Account safety flows (operator-led or second session)

| Flow | Task | Expected |
|------|------|----------|
| Password reset | Request reset; set new account password | Vault stays locked; email mentions vault separation |
| Account deletion | Delete test account (disposable) | Vault + notes removed; redirect to account-deleted page |

---

## Post-session questions

1. Did the name **LTG Vault** and subtitle make sense?
2. Was the difference between **account** and **vault** clear?
3. Did you feel your notes were private? Why or why not?
4. What felt confusing about recovery (phrase, passkey, trusted device)?
5. Was anything missing that you expected (export, attachments, community)?
6. How was the mobile experience (if applicable)?
7. Would you trust this app with personal prayers or reflections? What would increase trust?
8. Any wording that felt too technical or too religious?

---

## Issue log

| # | Flow | Severity | Description | Screenshot? |
|---|------|----------|-------------|-------------|
| 1 | | | | |
| 2 | | | | |

**Severity:** Blocker · Major · Minor · Cosmetic

---

## Exit criteria for private beta

- [ ] No blocker issues unresolved
- [ ] ≥80% of testers complete flows 1–10 without assistance
- [ ] Vault/account separation understood by majority
- [ ] Acceptance checklist (`LTG_VAULT_MVP_ACCEPTANCE_CHECKLIST.md`) signed off
