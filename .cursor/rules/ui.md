# UI Rules

- **Brand:** SelahKeep, purple primary (`--primary: #5b3a8c`), purple SK monogram favicon — no green sage envelope.
- **Design system:** `docs/DESIGN_SYSTEM.md` (direction **"Stillness"**; source specs in `docs/design/`). `docs/UI_UX_DIRECTION.md` for tone.
- **Tokens only:** style with the CSS variables in `src/app/globals.css`; never hardcode hex. Every surface must work in **light and dark** (`prefers-color-scheme`).
- **Type:** Schibsted Grotesk via `next/font` (`--font-sans`); tight heading tracking; `tabular-nums` for counters/countdowns.
- **Chips outlined** (category `--border-2`/`--primary`; tag `--border`/`--accent`). Primary buttons `--primary-solid`/`--on-primary`; links/icons `--primary`. Semantic colors stay semantic.
- Define **empty / loading / error** states; use the shimmer for loading.
- **Navigation:** `docs/LOGGED_IN_NAVIGATION_AUDIT.md` — Notes · Vault · Account (mobile bottom tabs, desktop sidebar). Vault Status Dock shows lock state + countdown.
- For screens not in the hero specs, **infer from the design tokens/patterns** — don't invent a new language.
- Mobile-first; calm, private, reflective copy; no crypto jargon. Account sign-in and vault unlock stay visually separate.
- Vault unlock gate before decrypted note content.
- Markdown preview must be sanitized (DOMPurify).
- Auth UI from `@tgoliveira/secure-auth/react` — do not fork package internals.
