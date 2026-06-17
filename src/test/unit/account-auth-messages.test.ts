import { describe, it, expect } from "vitest";
import {
  ACCOUNT_DELETION_VAULT_NOTE,
  ACCOUNT_PASSWORD_RESET_VAULT_NOTE,
  ACCOUNT_PASSWORD_VAULT_NOTE,
  CHECK_EMAIL_MESSAGE,
} from "@/lib/account-auth-messages";

describe("account auth messages", () => {
  it("includes vault separation copy", () => {
    expect(ACCOUNT_PASSWORD_VAULT_NOTE).toMatch(/does not unlock your vault/i);
    expect(ACCOUNT_PASSWORD_VAULT_NOTE).toMatch(/recovery phrase/i);
    expect(ACCOUNT_PASSWORD_RESET_VAULT_NOTE).toMatch(/vault and private notes remain protected/i);
    expect(ACCOUNT_DELETION_VAULT_NOTE).toMatch(/vault.*encrypted notes/i);
    expect(CHECK_EMAIL_MESSAGE).toContain("verification link");
  });
});
