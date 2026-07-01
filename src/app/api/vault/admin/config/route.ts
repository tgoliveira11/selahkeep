import { NextResponse } from "next/server";
import {
  listVaultAdminConfigEntries,
  validateVaultAdminOverride,
} from "@tgoliveira/vault-core";
import { AdminForbiddenError, requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { getVaultAdminConfig } from "@/lib/env/vault-from-env";
import {
  deleteVaultAdminConfigOverride,
  listVaultAdminConfigOverrideRecords,
  upsertVaultAdminConfigOverride,
} from "@/modules/vault/repositories/vault-admin-config-override-repository";
import { VaultAdminConfigStorageError } from "@/modules/vault/repositories/vault-admin-config-storage-error";
import { apiError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);
    const overrides = await listVaultAdminConfigOverrideRecords();
    const config = getVaultAdminConfig(process.env, overrides);
    const entries = listVaultAdminConfigEntries(config, process.env, overrides);
    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof VaultAdminConfigStorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return apiError(error, "GET /api/vault/admin/config");
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin(request);
    const body = (await request.json()) as { key?: string; value?: unknown };
    if (!body.key || body.value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }
    validateVaultAdminOverride(body.key, body.value);
    await upsertVaultAdminConfigOverride(body.key, body.value);
    const overrides = await listVaultAdminConfigOverrideRecords();
    const config = getVaultAdminConfig(process.env, overrides);
    const entries = listVaultAdminConfigEntries(config, process.env, overrides);
    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof VaultAdminConfigStorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message.includes("not overridable")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "POST /api/vault/admin/config");
  }
}

export async function DELETE(request: Request) {
  try {
    await requirePlatformAdmin(request);
    const body = (await request.json()) as { key?: string };
    if (!body.key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    await deleteVaultAdminConfigOverride(body.key);
    const overrides = await listVaultAdminConfigOverrideRecords();
    const config = getVaultAdminConfig(process.env, overrides);
    const entries = listVaultAdminConfigEntries(config, process.env, overrides);
    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof VaultAdminConfigStorageError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return apiError(error, "DELETE /api/vault/admin/config");
  }
}
