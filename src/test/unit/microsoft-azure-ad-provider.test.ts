import { describe, it, expect } from "vitest";
import AzureADProvider from "next-auth/providers/azure-ad";
import {
  MICROSOFT_OAUTH_CHECKS,
  buildMicrosoftAzureAdProviderOptions,
  createMicrosoftAzureAdProvider,
} from "@/modules/auth/lib/microsoft-azure-ad-provider";
import { MICROSOFT_OAUTH_SCOPES } from "@/modules/auth/lib/microsoft-provider-config";

const ENV = {
  clientId: "11111111-2222-3333-4444-555555555555",
  clientSecret: "client-secret",
  tenantId: "common",
};

describe("microsoft azure ad provider", () => {
  it("enables PKCE and state checks required by Microsoft Entra", () => {
    const options = buildMicrosoftAzureAdProviderOptions(ENV);
    expect(options.checks).toEqual(MICROSOFT_OAUTH_CHECKS);
  });

  it("passes PKCE checks through provider options for NextAuth merge", () => {
    const provider = createMicrosoftAzureAdProvider(ENV);
    expect(provider.id).toBe("azure-ad");
    expect(provider.options?.checks).toEqual(["pkce", "state"]);
    expect(provider.authorization?.params?.scope).toBe(MICROSOFT_OAUTH_SCOPES);

    const baseline = AzureADProvider({
      clientId: ENV.clientId,
      clientSecret: ENV.clientSecret,
      tenantId: ENV.tenantId,
    });
    expect(baseline.options?.checks).toBeUndefined();
  });
});
