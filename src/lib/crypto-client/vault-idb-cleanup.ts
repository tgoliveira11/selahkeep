import { openDB } from "idb";

const DB_NAME = "letters-vault";
/** Bumps past v2 device_secrets / vault_envelopes stores — wipes trusted-device material. */
const DB_VERSION = 4;

let cleanupPromise: Promise<void> | null = null;

/**
 * Removes legacy trusted-device IndexedDB stores on first load after removal.
 * Safe to call multiple times; runs once per page session.
 */
export async function purgeTrustedDeviceIdb(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  if (cleanupPromise) return cleanupPromise;

  cleanupPromise = (async () => {
    await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 3) {
          for (const name of [...db.objectStoreNames]) {
            if (name === "device_secrets" || name === "vault_envelopes") {
              db.deleteObjectStore(name);
            }
          }
        }
        if (!db.objectStoreNames.contains("encrypted_note_drafts")) {
          db.createObjectStore("encrypted_note_drafts", { keyPath: ["userId", "draftKey"] });
        }
      },
    });
  })();

  return cleanupPromise;
}
