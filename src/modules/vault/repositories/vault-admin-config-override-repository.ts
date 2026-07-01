import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vaultAdminConfigOverrides } from "@/lib/db/app-schema";
import {
  formatVaultAdminConfigStorageError,
  isMissingVaultAdminConfigOverridesTable,
  VaultAdminConfigStorageError,
} from "@/modules/vault/repositories/vault-admin-config-storage-error";

function rethrowVaultAdminConfigStorageError(
  error: unknown,
  operation: "load" | "save" | "delete"
): never {
  throw new VaultAdminConfigStorageError(formatVaultAdminConfigStorageError(error, operation), {
    cause: error,
  });
}

export async function listVaultAdminConfigOverrideRecords(): Promise<
  Record<string, unknown>
> {
  try {
    const rows = await db.select().from(vaultAdminConfigOverrides);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch (error) {
    if (isMissingVaultAdminConfigOverridesTable(error)) {
      return {};
    }
    rethrowVaultAdminConfigStorageError(error, "load");
  }
}

export async function upsertVaultAdminConfigOverride(
  key: string,
  value: unknown
): Promise<void> {
  try {
    await db
      .insert(vaultAdminConfigOverrides)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: vaultAdminConfigOverrides.key,
        set: { value, updatedAt: new Date() },
      });
  } catch (error) {
    rethrowVaultAdminConfigStorageError(error, "save");
  }
}

export async function deleteVaultAdminConfigOverride(key: string): Promise<void> {
  try {
    await db.delete(vaultAdminConfigOverrides).where(eq(vaultAdminConfigOverrides.key, key));
  } catch (error) {
    rethrowVaultAdminConfigStorageError(error, "delete");
  }
}
