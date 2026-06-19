# SelahKeep — Vault setup recovery phrase confirmation

**Product:** SelahKeep  
**Status:** Implemented

---

## Flow

1. Choose vault password
2. Choose 12- or 24-word recovery phrase length
3. Display phrase once (copy + download)
4. Confirm with randomized word-position challenge
5. Create vault (client-side crypto, encrypted envelopes to server)

---

## Display step

Users can:

- **Copy recovery phrase** to clipboard
- **Download** `selahkeep-recovery-phrase.txt` (client-side only)

Download content includes numbered words in exact order and safety warnings.

Users must check **I saved this securely** before continuing.

---

## Challenge confirmation

Instead of re-entering the full phrase, users enter specific words at randomized positions:

| Phrase length | Words requested |
|---------------|-----------------|
| 12 words | 3 random positions |
| 24 words | 6 random positions |

- Positions are **1-based** (`Word #2`, `Word #7`, …)
- Positions are unique and generated client-side with `crypto.getRandomValues`
- Challenge indices are **not** sent to the server
- Wrong answers show: *Some words do not match. Check your recovery phrase and try again.*
- Correct answers are never revealed on failure
- Regenerating the phrase regenerates the challenge

Validation uses `@tgoliveira/vault-core` `assertRecoveryPhraseWordConfirmation` via the app wrapper `assertRecoveryPhraseChallengeAnswers`.

---

## Security boundaries

- Recovery phrase never sent to server during setup confirmation
- Download is client-side only; no app storage of file contents
- No logging of phrase, challenge answers, UVK, or PRF output
- Phrase not persisted in localStorage/sessionStorage/IndexedDB

---

## Related docs

- `docs/VAULT_DOCK_UX.md`
- `SECURITY.md`
