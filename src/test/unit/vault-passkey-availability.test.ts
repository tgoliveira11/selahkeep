import { describe, it, expect } from "vitest";
import {
  canAttemptVaultPasskeySetup,
  deriveVaultPasskeyAvailability,
  shouldShowVaultPasskeyDestructiveActions,
} from "@/lib/passkey/vault-passkey-availability";
import type { PasskeyPrfEnvironmentSnapshot } from "@/lib/passkey/passkey-prf-diagnostics";
import { getVaultPasskeyAvailabilityCopy } from "@/lib/passkey/vault-passkey-availability-messages";

function env(overrides: Partial<PasskeyPrfEnvironmentSnapshot> = {}): PasskeyPrfEnvironmentSnapshot {
  return {
    userAgent: "test",
    secureContext: true,
    webauthnAvailable: true,
    credentialsApiAvailable: true,
    clientCapabilitiesAvailable: true,
    clientCapabilitiesPrf: null,
    capabilityProbe: "unknown",
    ...overrides,
  };
}

const baseInput = {
  vaultEnvelopeConfigured: false,
  vaultConfigured: true,
  vaultUnlocked: true,
  environment: env(),
};

describe("deriveVaultPasskeyAvailability", () => {
  it("1. shows webauthn_unavailable when WebAuthn is missing", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        environment: env({
          webauthnAvailable: false,
          credentialsApiAvailable: false,
          capabilityProbe: "unsupported",
        }),
      })
    ).toEqual({ state: "browser_unsupported", reason: "webauthn_unavailable" });
  });

  it("2. shows insecure_context when not on HTTPS/localhost", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        environment: env({ secureContext: false, capabilityProbe: "unsupported" }),
      })
    ).toEqual({ state: "browser_unsupported", reason: "insecure_context" });
  });

  it("3. shows prf_unsupported when capability probe is unsupported with WebAuthn present", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        environment: env({ capabilityProbe: "unsupported" }),
      })
    ).toEqual({ state: "prf_unsupported", reason: "prf_unsupported" });
  });

  it("6. no account passkey + PRF available + unlocked vault => available", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        environment: env({ capabilityProbe: "supported", clientCapabilitiesPrf: true }),
      })
    ).toEqual({ state: "available" });
  });

  it("7. no account passkey + PRF unavailable => prf unsupported, not account prerequisite", () => {
    const availability = deriveVaultPasskeyAvailability({
      ...baseInput,
      environment: env({ capabilityProbe: "unsupported" }),
    });
    expect(availability.state).toBe("prf_unsupported");
    expect(availability.state).not.toBe("requires_account_passkey" as never);
  });

  it("8. account passkey presence is not part of availability decision", () => {
    const availability = deriveVaultPasskeyAvailability({
      ...baseInput,
      environment: env({ capabilityProbe: "supported" }),
    });
    expect(availability.state).toBe("available");
  });

  it("9. missing vault passkey envelope means not configured or available, not browser unsupported", () => {
    const availability = deriveVaultPasskeyAvailability({
      ...baseInput,
      environment: env({ capabilityProbe: "unknown" }),
    });
    expect(availability.state).not.toBe("browser_unsupported");
    expect(["unknown", "not_configured", "prf_unsupported"]).toContain(availability.state);
  });

  it("10. existing envelope plus unsupported browser shows configured but unavailable here", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        vaultEnvelopeConfigured: true,
        environment: env({
          webauthnAvailable: false,
          credentialsApiAvailable: false,
          capabilityProbe: "unsupported",
        }),
      })
    ).toEqual({ state: "configured", unavailableInThisBrowser: true });
  });

  it("shows vault_locked when vault is locked during setup", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        vaultUnlocked: false,
      })
    ).toEqual({ state: "vault_locked" });
  });

  it("shows vault_not_configured when vault is missing", () => {
    expect(
      deriveVaultPasskeyAvailability({
        ...baseInput,
        vaultConfigured: false,
      })
    ).toEqual({ state: "vault_not_configured" });
  });

  it("unknown probe shows try setup, not unsupported", () => {
    const availability = deriveVaultPasskeyAvailability({
      ...baseInput,
      environment: env({ capabilityProbe: "unknown", clientCapabilitiesPrf: null }),
    });
    expect(availability.state).toBe("unknown");
    expect(getVaultPasskeyAvailabilityCopy(availability)?.cta).toMatch(/try passkey setup/i);
  });

  it("provider does not report PRF pre-ceremony but setup may still be attempted", () => {
    const availability = deriveVaultPasskeyAvailability({
      ...baseInput,
      environment: env({
        clientCapabilitiesPrf: false,
        clientCapabilitiesAvailable: true,
        capabilityProbe: "unknown",
      }),
    });
    expect(availability).toEqual({ state: "unknown", reason: "probe_unavailable" });
    expect(canAttemptVaultPasskeySetup(availability)).toBe(true);
  });

  it("hides destructive actions when configured envelope is unavailable here", () => {
    const availability = deriveVaultPasskeyAvailability({
      ...baseInput,
      vaultEnvelopeConfigured: true,
      environment: env({ webauthnAvailable: false, capabilityProbe: "unsupported" }),
    });
    expect(shouldShowVaultPasskeyDestructiveActions(availability, true)).toBe(false);
  });
});

describe("vault passkey copy", () => {
  it("does not mention account passkey prerequisite", () => {
    const copy = getVaultPasskeyAvailabilityCopy({ state: "available" });
    expect(copy?.headline.toLowerCase()).not.toContain("account passkey first");
    expect(copy?.explanation.toLowerCase()).not.toContain("link a compatible passkey");
  });
});
