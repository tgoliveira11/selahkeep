const VAULT_DOCK_EXPAND_EVENT = "selahkeep:vault-dock-expand";

/** Ask the global Vault Status Dock to expand (e.g. from /notes locked state). */
export function requestVaultDockExpand(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VAULT_DOCK_EXPAND_EVENT));
}

export function subscribeVaultDockExpand(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(VAULT_DOCK_EXPAND_EVENT, listener);
  return () => window.removeEventListener(VAULT_DOCK_EXPAND_EVENT, listener);
}
