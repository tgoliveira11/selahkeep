import { describe, it, expect } from "vitest";
import {
  ACCOUNT_PASSWORD_RESET_VAULT_NOTE,
  ACCOUNT_PASSWORD_VAULT_NOTE,
  CHECK_EMAIL_MESSAGE,
} from "@/lib/account-auth-messages";

describe("account auth messages", () => {
  it("includes vault separation copy", () => {
    expect(ACCOUNT_PASSWORD_VAULT_NOTE).toContain("does not replace your private letter recovery code");
    expect(ACCOUNT_PASSWORD_RESET_VAULT_NOTE).toContain("private letters remain protected");
    expect(CHECK_EMAIL_MESSAGE).toContain("verification link");
  });
});
