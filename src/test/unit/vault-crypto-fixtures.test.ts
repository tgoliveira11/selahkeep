import { describe, it, expect } from "vitest";
import {
  VAULT_FIXTURE_USER_ID,
  loadPasswordVaultFixture,
} from "@/test/helpers/vault-crypto-fixtures";

describe("vault-crypto-fixtures", () => {
  it("uses a stable fixture user id", () => {
    expect(VAULT_FIXTURE_USER_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("memoizes the password vault fixture", async () => {
    const first = await loadPasswordVaultFixture();
    const second = await loadPasswordVaultFixture();
    expect(second).toBe(first);
    expect(first.password).toBeTruthy();
  });
});
