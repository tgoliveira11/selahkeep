import { describe, it, expect } from "vitest";
import { isVaultFullUnlockPage } from "@/features/vault/vault-status-dock-routes";

describe("vault status dock routes", () => {
  it("detects the full unlock page path", () => {
    expect(isVaultFullUnlockPage("/vault/unlock")).toBe(true);
    expect(isVaultFullUnlockPage("/vault/settings")).toBe(false);
    expect(isVaultFullUnlockPage("/notes")).toBe(false);
  });
});
