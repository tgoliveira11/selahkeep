/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from "vitest";

const appSignInWithPasskey = vi.fn();

vi.mock("@/features/passkey/sign-in-with-passkey", () => ({
  signInWithPasskey: appSignInWithPasskey,
  buildPasskeyLoginOutcomeKey: (slug: string) => `${slug}-passkey-login-outcome`,
}));

describe("secure-auth react client shim", () => {
  it("re-exports signInWithPasskey from the product passkey feature", async () => {
    const shim = await import("@/lib/secure-auth/react-client");
    expect(shim.signInWithPasskey).toBe(appSignInWithPasskey);
    expect(shim.buildPasskeyLoginOutcomeKey("letters-to-god")).toBe(
      "letters-to-god-passkey-login-outcome"
    );
  });
});
