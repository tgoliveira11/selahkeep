# UI / UX rules

## Security-sensitive UI

- Never display private letter title/body in `document.title`, URLs, analytics, or notifications.
- Never persist letter drafts in localStorage, sessionStorage, or cookies.
- Recovery codes: show only during generation flow; clear from React state after user confirms saved.
- Do not present passkey as vault recovery when PRF registration failed.
- Destructive actions (delete letter, revoke device, delete account) require explicit confirmation.

## Component conventions

- Use shared components under `src/components/ui/` — avoid one-off card/button styles on pages.
- Route groups `(public)`, `(auth)`, and `(vault)` use `SiteShell` (header + footer). Use `PageLayout` inside the shell for content width.
- Use `FormField` for labeled inputs (not placeholder-only).
- Use `ConfirmDialog` instead of `window.confirm` for in-app destructive actions.
- Use `LoadingState`, `EmptyState`, `ErrorState`, `Alert` for async UX.

## Copy

- User-facing terms: private letters, vault, recovery code, trusted device, passkey.
- Avoid: AES-GCM, envelope, KDF, PRF, ciphertext in UI copy.
- Tone: calm, honest, warm — not fear-based.

## Mobile first

- Primary actions full-width on small screens (`w-full sm:w-auto`).
- Navigation uses collapsible menu below `md` breakpoint.
- Min touch target height 44px (`min-h-11` on buttons/inputs).

## Documentation

- Audit: `docs/UI_UX_AUDIT.md`
- Implementation plan: `docs/UI_UX_IMPLEMENTATION_PLAN.md`
