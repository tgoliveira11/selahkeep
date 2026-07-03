import { describe, it, expect } from "vitest";
import {
  parseVaultDeviceBindingId,
  VAULT_DEVICE_BINDING_COOKIE,
  VAULT_DEVICE_BINDING_MAX_AGE_SECONDS,
} from "@/lib/passkey/vault-device-binding-cookie";

describe("vault device binding cookie", () => {
  it("parses valid UUID binding ids only", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseVaultDeviceBindingId(id)).toBe(id);
    expect(parseVaultDeviceBindingId("not-a-uuid")).toBeUndefined();
    expect(parseVaultDeviceBindingId("")).toBeUndefined();
  });

  it("uses stable cookie name and long max age", () => {
    expect(VAULT_DEVICE_BINDING_COOKIE).toBe("selahkeep_vault_device");
    expect(VAULT_DEVICE_BINDING_MAX_AGE_SECONDS).toBeGreaterThanOrEqual(60 * 60 * 24 * 30);
  });
});
