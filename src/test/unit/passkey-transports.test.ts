import { describe, it, expect } from "vitest";
import {
  persistRegistrationTransports,
  storedPasskeyTransports,
  summarizePasskeyTransportHints,
  collectPasskeyTransportHints,
  inferAuthenticatorAttachmentFromTransports,
  vaultRegistrationExcludeCredentials,
  toAllowCredentialDescriptor,
} from "@/lib/passkey/passkey-transports";

describe("passkey transports", () => {
  it("persists browser-reported transports exactly", () => {
    expect(persistRegistrationTransports(["internal"])).toEqual(["internal"]);
    expect(persistRegistrationTransports(["hybrid", "internal"])).toEqual(["hybrid", "internal"]);
  });

  it("returns null when registration transports are missing", () => {
    expect(persistRegistrationTransports(undefined)).toBeNull();
    expect(persistRegistrationTransports([])).toBeNull();
  });

  it("includes stored transports in allowCredentials descriptors", () => {
    expect(
      toAllowCredentialDescriptor({
        credentialId: "vault-cred",
        transports: ["internal"],
      })
    ).toEqual({ id: "vault-cred", transports: ["internal"] });
  });

  it("omits transports field when none are stored", () => {
    expect(
      toAllowCredentialDescriptor({
        credentialId: "vault-cred",
        transports: null,
      })
    ).toEqual({ id: "vault-cred" });
  });

  it("collects transport hints as sorted unique labels", () => {
    expect(collectPasskeyTransportHints(undefined)).toEqual(["none"]);
    expect(
      collectPasskeyTransportHints([
        { transports: ["internal"] },
        { transports: ["hybrid", "internal"] },
      ])
    ).toEqual(["hybrid", "internal"]);
  });

  it("infers authenticator attachment from stored transports", () => {
    expect(inferAuthenticatorAttachmentFromTransports([{ transports: ["internal"] }])).toBe(
      "platform"
    );
    expect(inferAuthenticatorAttachmentFromTransports([{ transports: ["hybrid"] }])).toBe(
      "cross-platform"
    );
    expect(inferAuthenticatorAttachmentFromTransports(undefined)).toBe("unknown");
  });

  it("vault registration excludeCredentials filters active vault-enabled credentials only", () => {
    expect(
      vaultRegistrationExcludeCredentials([
        {
          credentialId: "account-cred",
          signInEnabled: true,
          vaultUnlockEnabled: false,
          transports: ["internal"],
        } as never,
        {
          credentialId: "vault-cred",
          signInEnabled: false,
          vaultUnlockEnabled: true,
          transports: ["internal"],
        } as never,
        {
          credentialId: "disabled-vault",
          signInEnabled: false,
          vaultUnlockEnabled: false,
          transports: ["internal"],
        } as never,
      ])
    ).toEqual([{ id: "vault-cred", transports: ["internal"] }]);
  });

  it("summarizes transport hints for diagnostics", () => {
    expect(summarizePasskeyTransportHints(undefined)).toBe("none");
    expect(
      summarizePasskeyTransportHints([{ id: "a", transports: ["internal"] } as never])
    ).toBe("internal");
    expect(
      summarizePasskeyTransportHints([
        { id: "a", transports: ["internal"] } as never,
        { id: "b", transports: ["hybrid"] } as never,
      ])
    ).toBe("mixed");
  });

  it("storedPasskeyTransports does not invent internal transport", () => {
    expect(storedPasskeyTransports(null)).toBeUndefined();
    expect(storedPasskeyTransports(undefined)).toBeUndefined();
    expect(storedPasskeyTransports([])).toBeUndefined();
  });

});
