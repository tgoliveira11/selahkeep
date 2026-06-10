import { openDB, type IDBPDatabase } from "idb";
import type { EncryptedPayload } from "@/lib/validation/encrypted-payload";

const DB_NAME = "letters-vault";
const DB_VERSION = 2;

interface DeviceSecretRecord {
  deviceId: string;
  /** Non-extractable AES-GCM key — never store raw key bytes in IndexedDB. */
  deviceSecretKey: CryptoKey;
  userId: string;
}

interface VaultEnvelopeRecord {
  userId: string;
  deviceId: string;
  encryptedVaultKey: EncryptedPayload;
}

interface VaultDB {
  device_secrets: {
    key: string;
    value: DeviceSecretRecord;
  };
  vault_envelopes: {
    key: string;
    value: VaultEnvelopeRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 stored exportable raw device secrets as base64 strings — wipe on upgrade.
        if (oldVersion > 0 && oldVersion < 2) {
          for (const name of [...db.objectStoreNames]) {
            db.deleteObjectStore(name);
          }
        }
        if (!db.objectStoreNames.contains("device_secrets")) {
          db.createObjectStore("device_secrets");
        }
        if (!db.objectStoreNames.contains("vault_envelopes")) {
          db.createObjectStore("vault_envelopes");
        }
      },
    });
  }
  return dbPromise;
}

async function createDeviceSecretKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function getOrCreateDeviceSecret(userId: string): Promise<{
  deviceId: string;
  deviceSecret: CryptoKey;
}> {
  const db = await getDB();
  const existing = await db.get("device_secrets", userId);
  if (existing?.deviceSecretKey) {
    return { deviceId: existing.deviceId, deviceSecret: existing.deviceSecretKey };
  }

  const deviceId = crypto.randomUUID();
  const deviceSecretKey = await createDeviceSecretKey();

  await db.put(
    "device_secrets",
    {
      deviceId,
      deviceSecretKey,
      userId,
    },
    userId
  );

  return { deviceId, deviceSecret: deviceSecretKey };
}

export async function storeLocalVaultEnvelope(
  userId: string,
  deviceId: string,
  encryptedVaultKey: EncryptedPayload
): Promise<void> {
  const db = await getDB();
  await db.put("vault_envelopes", { userId, deviceId, encryptedVaultKey }, userId);
}

export async function getLocalVaultEnvelope(
  userId: string
): Promise<EncryptedPayload | null> {
  const db = await getDB();
  const envelope = await db.get("vault_envelopes", userId);
  return envelope?.encryptedVaultKey ?? null;
}

export async function clearLocalVaultData(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete("device_secrets", userId);
  await db.delete("vault_envelopes", userId);
}
