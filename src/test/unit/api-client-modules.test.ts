import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notesApi } from "@/lib/api-client/notes";
import { vaultApi } from "@/lib/api-client/vault";
import { trustedDevicesApi } from "@/lib/api-client/trusted-devices";
import { passkeysApi } from "@/lib/api-client/passkeys";
import { createNoteInput, encryptedPayload, USER_ID } from "@/test/helpers/fixtures";

describe("typed API client modules", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/notes" && !init?.method) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/notes/id-1" && init?.method === "DELETE") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        if (url === "/api/notes/id-1" && init?.method === "PUT") {
          return new Response(JSON.stringify({ id: "id-1" }), { status: 200 });
        }
        if (url === "/api/notes/id-1") {
          return new Response(JSON.stringify({ id: "id-1" }), { status: 200 });
        }
        if (url === "/api/notes" && init?.method === "POST") {
          return new Response(JSON.stringify({ id: "new" }), { status: 201 });
        }
        if (url === "/api/vault/settings" && !init?.method) {
          return new Response(JSON.stringify({ encryptedVaultSettings: null }), { status: 200 });
        }
        if (url === "/api/vault/settings" && init?.method === "PATCH") {
          return new Response(JSON.stringify({ encryptedVaultSettings: encryptedPayload("vault_settings", USER_ID) }), {
            status: 200,
          });
        }
        if (url === "/api/vault/status") {
          return new Response(JSON.stringify({ initialized: true }), { status: 200 });
        }
        if (url === "/api/vault/init" && init?.method === "POST") {
          return new Response(JSON.stringify({ id: "vault-1" }), { status: 201 });
        }
        if (url === "/api/recovery-code" && init?.method === "POST") {
          return new Response(JSON.stringify({ id: "env-1" }), { status: 201 });
        }
        if (url === "/api/vault/unlock-with-recovery-code" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
              kdfMetadata: {},
            }),
            { status: 200 }
          );
        }
        if (url === "/api/vault/device-envelopes") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/trusted-devices" && init?.method === "POST") {
          return new Response(JSON.stringify({ id: "dev-1", deviceName: "Chrome" }), {
            status: 201,
          });
        }
        if (url === "/api/trusted-devices") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url === "/api/trusted-devices/dev-1" && init?.method === "DELETE") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        if (url === "/api/trusted-devices/dev-1" && init?.method === "PATCH") {
          return new Response(JSON.stringify({ id: "dev-1", deviceName: "Home MacBook" }), {
            status: 200,
          });
        }
        if (url === "/api/trusted-devices/touch" && init?.method === "POST") {
          return new Response(JSON.stringify({ updated: true, state: "active" }), { status: 200 });
        }
        if (url.startsWith("/api/trusted-devices/status")) {
          return new Response(JSON.stringify({ state: "active" }), { status: 200 });
        }
        if (url === "/api/passkeys" && init?.method === "DELETE") {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      })
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("notesApi covers CRUD helpers", async () => {
    await expect(notesApi.list()).resolves.toEqual([]);
    await expect(notesApi.get("id-1")).resolves.toEqual({ id: "id-1" });
    await expect(notesApi.create(createNoteInput())).resolves.toEqual({ id: "new" });
    await expect(notesApi.update("id-1", createNoteInput())).resolves.toEqual({ id: "id-1" });
    await expect(notesApi.delete("id-1")).resolves.toEqual({ success: true });
  });

  it("vaultApi covers vault endpoints", async () => {
    await expect(vaultApi.status()).resolves.toEqual({ initialized: true });
    await expect(vaultApi.getSettings()).resolves.toEqual({ encryptedVaultSettings: null });
    await expect(
      vaultApi.updateSettings(encryptedPayload("vault_settings", USER_ID))
    ).resolves.toHaveProperty("encryptedVaultSettings");
    await expect(
      vaultApi.init({
        vaultVersion: "vault-v1",
        envelopes: [
          {
            method: "trusted_device",
            encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
          },
        ],
      })
    ).resolves.toEqual({ id: "vault-1" });
    await expect(
      vaultApi.storeRecoveryCode({
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
        kdfMetadata: {
          kdf: "argon2id",
          version: "kdf-v1",
          salt: "c2FsdA",
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
      })
    ).resolves.toEqual({ id: "env-1" });
    await expect(vaultApi.unlockWithRecoveryCode()).resolves.toHaveProperty("encryptedVaultKey");
    await expect(vaultApi.deviceEnvelopes()).resolves.toEqual([]);
  });

  it("trustedDevicesApi covers list/create/rename/touch/revoke", async () => {
    await expect(trustedDevicesApi.list()).resolves.toEqual([]);
    await expect(
      trustedDevicesApi.create({
        deviceName: "Chrome",
        encryptedVaultKey: encryptedPayload("vault_key", USER_ID),
      })
    ).resolves.toBeDefined();
    await expect(
      trustedDevicesApi.rename("dev-1", { deviceName: "Home MacBook" })
    ).resolves.toEqual({ id: "dev-1", deviceName: "Home MacBook" });
    await expect(
      trustedDevicesApi.touch({ deviceId: "550e8400-e29b-41d4-a716-446655440000" })
    ).resolves.toEqual({ updated: true, state: "active" });
    await expect(trustedDevicesApi.revoke("dev-1")).resolves.toEqual({ success: true });
  });

  it("passkeysApi covers removeAll", async () => {
    await expect(passkeysApi.removeAll()).resolves.toEqual({ success: true });
  });
});
