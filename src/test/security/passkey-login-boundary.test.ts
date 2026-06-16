import { describe, it, expect } from "vitest";
import { getPasskeyCapabilityLabel } from "@/lib/passkey/credential-label";

describe("passkey login security boundaries", () => {
  it("treats sign-in-only passkeys separately from vault recovery", () => {
    expect(
      getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: false })
    ).toBe("sign-in-only");
    expect(
      getPasskeyCapabilityLabel({ signInEnabled: true, vaultUnlockEnabled: true })
    ).toBe("sign-in-and-vault-unlock");
  });

  it("delegates account passkey verify to the package route", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const verifyRoute = readFileSync(
      join(process.cwd(), "src/app/api/auth/passkey/login/verify/route.ts"),
      "utf8"
    );
    expect(verifyRoute).toContain("secureAuth.routes.passkeyLoginVerify.POST");
  });
});
