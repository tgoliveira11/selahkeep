export const VAULT_STATUS_DOCK_COLLAPSED_KEY = "selahkeep:vault-status-dock:collapsed";

/** Reads UI-only collapse preference. Never stores secrets or note data. */
export function readVaultStatusDockCollapsedPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") return null;
    const value = storage.getItem(VAULT_STATUS_DOCK_COLLAPSED_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeVaultStatusDockCollapsedPreference(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") return;
    storage.setItem(VAULT_STATUS_DOCK_COLLAPSED_KEY, collapsed ? "true" : "false");
  } catch {
    // Ignore storage failures; UI preference is non-critical.
  }
}
