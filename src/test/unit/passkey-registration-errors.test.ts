import { describe, it, expect } from "vitest";
import { toPasskeyRegistrationErrorMessage } from "@/lib/passkey/webauthn-config";
import { PASSKEY_PLATFORM_AUTHENTICATOR_CONFLICT_MESSAGE } from "@/lib/passkey/messages";

describe("passkey registration error mapping", () => {
  it("maps identifier already used to platform authenticator conflict copy", () => {
    const error = new Error("The identifier is already used by another credential.");
    expect(toPasskeyRegistrationErrorMessage(error)).toBe(
      PASSKEY_PLATFORM_AUTHENTICATOR_CONFLICT_MESSAGE
    );
  });

  it("maps InvalidStateError to platform authenticator conflict copy", () => {
    const error = Object.assign(new Error("credential exists"), { name: "InvalidStateError" });
    expect(toPasskeyRegistrationErrorMessage(error)).toBe(
      PASSKEY_PLATFORM_AUTHENTICATOR_CONFLICT_MESSAGE
    );
  });

  it("returns null for unrelated errors", () => {
    expect(toPasskeyRegistrationErrorMessage(new Error("network failed"))).toBeNull();
    expect(toPasskeyRegistrationErrorMessage("bad")).toBeNull();
  });
});
