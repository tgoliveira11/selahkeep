import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MICROSOFT_OAUTH_PROVIDER_ID,
  MICROSOFT_OAUTH_SCOPES,
  describeMicrosoftProviderConfigIssue,
  isMicrosoftProviderConfigured,
  isValidMicrosoftApplicationClientId,
  readMicrosoftProviderEnv,
} from "@/modules/auth/lib/microsoft-provider-config";

const VALID_CLIENT_ID = "11111111-2222-3333-4444-555555555555";

describe("microsoft provider config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses azure-ad as the NextAuth provider id", () => {
    expect(MICROSOFT_OAUTH_PROVIDER_ID).toBe("azure-ad");
  });

  it("documents minimal OIDC scopes", () => {
    expect(MICROSOFT_OAUTH_SCOPES).toBe("openid profile email");
  });

  it("returns null when credentials are missing", () => {
    vi.stubEnv("AUTH_AZURE_AD_ID", "");
    vi.stubEnv("AUTH_AZURE_AD_SECRET", "");
    expect(readMicrosoftProviderEnv()).toBeNull();
    expect(isMicrosoftProviderConfigured()).toBe(false);
    expect(describeMicrosoftProviderConfigIssue()).toBeNull();
  });

  it("rejects non-GUID client ids such as swapped client secrets", () => {
    const swappedSecretLikeClientId = "fake-microsoft-client-secret-shape-for-test";
    vi.stubEnv("AUTH_AZURE_AD_ID", swappedSecretLikeClientId);
    vi.stubEnv("AUTH_AZURE_AD_SECRET", "also-not-a-guid");

    expect(isValidMicrosoftApplicationClientId(swappedSecretLikeClientId)).toBe(false);
    expect(describeMicrosoftProviderConfigIssue()).toBe("invalid_client_id_format");
    expect(readMicrosoftProviderEnv()).toBeNull();
    expect(isMicrosoftProviderConfigured()).toBe(false);
  });

  it("parses client id, secret, and default tenant common", () => {
    vi.stubEnv("AUTH_AZURE_AD_ID", VALID_CLIENT_ID);
    vi.stubEnv("AUTH_AZURE_AD_SECRET", "client-secret");
    vi.stubEnv("AUTH_AZURE_AD_TENANT_ID", "");

    expect(readMicrosoftProviderEnv()).toEqual({
      clientId: VALID_CLIENT_ID,
      clientSecret: "client-secret",
      tenantId: "common",
    });
    expect(isMicrosoftProviderConfigured()).toBe(true);
    expect(describeMicrosoftProviderConfigIssue()).toBeNull();
  });

  it("honors explicit tenant id and AUTH_MICROSOFT_* aliases", () => {
    vi.stubEnv("AUTH_AZURE_AD_ID", "");
    vi.stubEnv("AUTH_AZURE_AD_SECRET", "");
    vi.stubEnv("AUTH_MICROSOFT_ID", VALID_CLIENT_ID);
    vi.stubEnv("AUTH_MICROSOFT_SECRET", "client-secret");
    vi.stubEnv("AUTH_MICROSOFT_TENANT_ID", "organizations");

    expect(readMicrosoftProviderEnv()?.tenantId).toBe("organizations");
  });
});
