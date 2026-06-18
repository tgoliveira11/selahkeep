/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatPasskeyPrfDiagnosticsReport,
  getPasskeyPrfDiagnosticHeadline,
  getPasskeyPrfDiagnosticMessage,
  isCeremonyCancellation,
  mapCapabilityProbeToReason,
  probePasskeyPrfEnvironment,
  probePasskeyPrfEnvironmentAsync,
  resolveCeremonyDiagnosticReason,
  resolvePreCeremonyDiagnosticReason,
  shouldBlockPasskeyVaultSetupBeforeCeremony,
  isPasskeyPrfManagementBlocked,
} from "@/lib/passkey/passkey-prf-diagnostics";

describe("passkey PRF diagnostics", () => {
  const originalPublicKeyCredential = globalThis.PublicKeyCredential;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    globalThis.PublicKeyCredential = originalPublicKeyCredential;
  });

  it("reports secure context and WebAuthn availability", () => {
    globalThis.PublicKeyCredential = {} as typeof PublicKeyCredential;
    const snapshot = probePasskeyPrfEnvironment();
    expect(snapshot.secureContext).toBe(true);
    expect(snapshot.webauthnAvailable).toBe(true);
    expect(snapshot.credentialsApiAvailable).toBe(true);
  });

  it("marks webauthn unavailable without PublicKeyCredential", () => {
    // @ts-expect-error test stub
    globalThis.PublicKeyCredential = undefined;
    const snapshot = probePasskeyPrfEnvironment();
    expect(snapshot.webauthnAvailable).toBe(false);
    expect(resolvePreCeremonyDiagnosticReason(snapshot)).toBe("webauthn_unavailable");
  });

  it("maps capability probe supported to supported reason", () => {
    expect(mapCapabilityProbeToReason("supported")).toBe("supported");
    expect(mapCapabilityProbeToReason("unknown")).toBe("unknown");
    expect(mapCapabilityProbeToReason("unsupported")).toBe("unsupported");
  });

  it("does not block setup when capability probe is unknown", async () => {
    globalThis.PublicKeyCredential = {
      getClientCapabilities: async () => ({}),
    } as unknown as typeof PublicKeyCredential;

    const env = await probePasskeyPrfEnvironmentAsync();
    expect(env.capabilityProbe).toBe("unknown");
    expect(shouldBlockPasskeyVaultSetupBeforeCeremony(env)).toBe(false);
    expect(resolvePreCeremonyDiagnosticReason(env)).toBeNull();
  });

  it("blocks setup when capability probe is explicitly unsupported", async () => {
    globalThis.PublicKeyCredential = {
      getClientCapabilities: async () => ({ "extension:prf": false }),
    } as unknown as typeof PublicKeyCredential;

    const env = await probePasskeyPrfEnvironmentAsync();
    expect(shouldBlockPasskeyVaultSetupBeforeCeremony(env)).toBe(true);
    expect(resolvePreCeremonyDiagnosticReason(env)).toBe("unsupported");
  });

  it("resolves ceremony cancellation", () => {
    const error = Object.assign(new Error("cancelled"), { name: "NotAllowedError" });
    expect(isCeremonyCancellation(error)).toBe(true);
    expect(resolveCeremonyDiagnosticReason({ prfOutputPresent: false, error })).toBe(
      "ceremony_cancelled"
    );
  });

  it("resolves prf_not_returned when ceremony succeeds without PRF", () => {
    expect(resolveCeremonyDiagnosticReason({ prfOutputPresent: false })).toBe("prf_not_returned");
    expect(resolveCeremonyDiagnosticReason({ prfOutputPresent: true })).toBe("supported");
  });

  it("provides diagnostic-specific messages", () => {
    expect(getPasskeyPrfDiagnosticMessage("prf_not_returned")).toMatch(/did not return PRF output/i);
    expect(getPasskeyPrfDiagnosticMessage("unknown")).toMatch(/can still try/i);
    expect(getPasskeyPrfDiagnosticHeadline("secure_context_required")).toMatch(/secure connection/i);
  });

  it("formats diagnostics without secret fields", () => {
    const report = formatPasskeyPrfDiagnosticsReport(
      {
        userAgent: "test-agent",
        secureContext: true,
        webauthnAvailable: true,
        credentialsApiAvailable: true,
        clientCapabilitiesAvailable: true,
        clientCapabilitiesPrf: null,
        capabilityProbe: "unknown",
      },
      {
        prfRequested: true,
        prfReturned: false,
        ceremonyCancelled: false,
        safeErrorName: null,
      }
    );
    expect(report).toContain("prfReturned: false");
    expect(report).not.toMatch(/prfOutput|uvk|secret/i);
  });

  it("blocks passkey vault management when PRF is explicitly unsupported", () => {
    expect(
      isPasskeyPrfManagementBlocked({
        userAgent: "test",
        secureContext: true,
        webauthnAvailable: true,
        credentialsApiAvailable: true,
        clientCapabilitiesAvailable: true,
        clientCapabilitiesPrf: false,
        capabilityProbe: "unknown",
      })
    ).toBe(true);
  });
});
