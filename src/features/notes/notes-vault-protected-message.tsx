/** Page-level message when notes require an unlocked vault (global bar holds unlock CTA). */
export function NotesVaultProtectedMessage() {
  return (
    <p className="text-sm leading-relaxed text-[var(--muted)]" data-testid="notes-vault-protected-message">
      Unlock your vault to read and write private notes on this device.
    </p>
  );
}
