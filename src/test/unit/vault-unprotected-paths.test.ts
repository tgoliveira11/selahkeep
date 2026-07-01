import { describe, it, expect } from "vitest";
import { isVaultUnprotectedPath } from "@/lib/vault/vault-unprotected-paths";

describe("isVaultUnprotectedPath", () => {
  it("matches /home exactly", () => {
    expect(isVaultUnprotectedPath("/home")).toBe(true);
  });

  it("matches nested /home paths", () => {
    expect(isVaultUnprotectedPath("/home/welcome")).toBe(true);
  });

  it("matches /vault/unlock exactly", () => {
    expect(isVaultUnprotectedPath("/vault/unlock")).toBe(true);
  });

  it("does not match vault-protected routes", () => {
    expect(isVaultUnprotectedPath("/notes")).toBe(false);
    expect(isVaultUnprotectedPath("/vault/settings")).toBe(false);
  });
});
