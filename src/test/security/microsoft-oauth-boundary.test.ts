import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { evaluateOAuthSignIn } from "@/modules/auth/lib/oauth-sign-in-policy";
import { createMicrosoftAzureAdProvider } from "@/modules/auth/lib/microsoft-azure-ad-provider";
import { MICROSOFT_OAUTH_SCOPES } from "@/modules/auth/lib/microsoft-provider-config";

const SENTINEL = "SENTINEL-PRIVATE-LETTER-DO-NOT-STORE-PLAINTEXT-12345";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("microsoft oauth security boundaries", () => {
  it("does not send private letter content through Microsoft auth modules", () => {
    const secureAuthSource = readSource("src/lib/secure-auth.ts");
    const socialSource = readSource("src/components/auth/social-sign-in.tsx");
    const policySource = readSource("src/modules/auth/lib/oauth-sign-in-policy.ts");

    for (const source of [secureAuthSource, socialSource, policySource]) {
      expect(source).not.toContain(SENTINEL);
      expect(source).not.toMatch(/title|body/);
    }
  });

  it("does not request Microsoft Graph scopes beyond minimal OIDC identity scopes", () => {
    const provider = createMicrosoftAzureAdProvider({
      clientId: "11111111-2222-3333-4444-555555555555",
      clientSecret: "test-secret",
      tenantId: "common",
    });

    const scope = provider.authorization?.params?.scope;
    expect(scope).toBe(MICROSOFT_OAUTH_SCOPES);
    expect(scope).not.toMatch(/Mail\.Read|Files\.Read|Calendars\.Read|Contacts\.Read|User\.Read|offline_access/);
    expect(provider.options?.checks).toContain("pkce");
  });

  it("uses a custom profile mapper to avoid default Graph photo fetch", () => {
    const profileSource = readSource("src/modules/auth/lib/oauth-provider-profile.ts");
    expect(profileSource).not.toContain("graph.microsoft.com");
  });

  it("rejects missing-email Microsoft sign-in safely", () => {
    const decision = evaluateOAuthSignIn({
      email: undefined,
      accountProvider: "azure-ad",
      existingUser: null,
    });
    expect(decision.action).toBe("reject");
  });

  it("does not auto-link credentials accounts to Microsoft OAuth", () => {
    const decision = evaluateOAuthSignIn({
      email: "victim@example.com",
      accountProvider: "azure-ad",
      existingUser: {
        authProvider: "credentials",
        emailVerifiedAt: new Date(),
      },
    });
    expect(decision.action).toBe("reject");
  });

  it("does not log Microsoft client secrets in auth config", () => {
    const configSource = readSource("src/modules/auth/lib/microsoft-provider-config.ts");
    expect(configSource).not.toMatch(/console\.log|safeLogger\.(info|debug|warn|error).*SECRET/i);
  });

  it("does not introduce frontend database access or server actions for letters", () => {
    const socialSource = readSource("src/components/auth/social-sign-in.tsx");
    expect(socialSource).not.toMatch(/from "@\/lib\/db"|use server|private letter/i);
  });
});
