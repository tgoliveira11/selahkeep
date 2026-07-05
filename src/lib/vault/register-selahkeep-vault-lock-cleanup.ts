import { registerVaultLockCleanup } from "@tgoliveira/vault-core/browser";
import { clearNoteBodyCache } from "@/features/notes/eager-decrypt-notes";

let registered = false;

/** Registers sync app cleanup handlers invoked by vault-core on every lock. Idempotent. */
export function registerSelahkeepVaultLockCleanup(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;

  registerVaultLockCleanup(() => {
    clearNoteBodyCache();
  });
}

/** @internal tests */
export function resetSelahkeepVaultLockCleanupRegistrationForTests(): void {
  registered = false;
}
