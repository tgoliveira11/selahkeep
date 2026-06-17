import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildSecureAuthConfigFromEnv, buildSecureAuthUiPublicConfigFromEnv } from "@/lib/env/secure-auth-from-env";
import { readBoolEnv } from "@/lib/env/parse";

const FORBIDDEN = [
  "@tgoliveira/secure-auth/server",
  "createRoutes",
  "createAuthServices",
  "createRouteHandlers",
  "getSecureAuthConfig",
  "getSecureAuthDb",
];

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === "test") continue;
      walk(path, files);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

describe("secure-auth import boundaries", () => {
  it("does not import forbidden package APIs", () => {
    const srcFiles = walk(join(process.cwd(), "src"));
    const violations: string[] = [];
    for (const file of srcFiles) {
      const content = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        if (content.includes(pattern)) violations.push(`${file}: ${pattern}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("buildSecureAuthConfigFromEnv", () => {
  const baseEnv = {
    NEXTAUTH_SECRET: "a".repeat(32),
    TWO_FACTOR_SECRET_ENCRYPTION_KEY: "b".repeat(32),
    APP_BASE_URL: "http://localhost:3001",
  };

  it("parses boolean env vars strictly", () => {
    expect(
      readBoolEnv({ AUTH_SINGLE_ACTIVE_SESSION: "true" }, "AUTH_SINGLE_ACTIVE_SESSION", false)
    ).toBe(true);
    expect(() =>
      readBoolEnv({ AUTH_SINGLE_ACTIVE_SESSION: "yes" }, "AUTH_SINGLE_ACTIVE_SESSION", false)
    ).toThrow(/must be "true" or "false"/);
  });

  it("honors PASSWORD_MIN_LENGTH below the previous client floor of 8", () => {
    const config = buildSecureAuthConfigFromEnv(
      { ...baseEnv, PASSWORD_MIN_LENGTH: "5", AUTH_PASSWORD_MIN_LENGTH: "5" },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );
    expect(config.passwordPolicy?.minLength).toBe(5);
  });

  it("maps password policy and single active session from env", () => {
    const config = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        AUTH_PASSWORD_POLICY_ENFORCEMENT: "enforce",
        AUTH_PASSWORD_MIN_LENGTH: "14",
        AUTH_SINGLE_ACTIVE_SESSION: "true",
        AUTH_SESSION_REVOCATION_POLL_SECONDS: "15",
      },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );

    expect(config.passwordPolicy?.enforcement).toBe("enforce");
    expect(config.passwordPolicy?.minLength).toBe(14);
    expect(config.sessions?.singleActiveSession).toBe(true);
    expect(config.sessions?.revocationPollIntervalSeconds).toBe(15);
  });

  it("falls back to legacy env names", () => {
    const config = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        GOOGLE_CLIENT_ID: "gid",
        GOOGLE_CLIENT_SECRET: "gsec",
        PASSWORD_POLICY_ENFORCEMENT: "off",
        RATE_LIMIT_STORE: "postgres",
      },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );

    expect(config.oauth?.google?.clientId).toBe("gid");
    expect(config.passwordPolicy?.enforcement).toBe("off");
    expect(config.rateLimit?.store).toBe("postgres");
  });

  it("maps GitHub OAuth from AUTH_* and legacy GITHUB_* env names", () => {
    const withAuthPrefix = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        AUTH_GITHUB_CLIENT_ID: "gh-auth-id",
        AUTH_GITHUB_CLIENT_SECRET: "gh-auth-secret",
      },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );
    expect(withAuthPrefix.oauth?.github?.clientId).toBe("gh-auth-id");
    expect(withAuthPrefix.oauth?.github?.clientSecret).toBe("gh-auth-secret");

    const withLegacy = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        GITHUB_CLIENT_ID: "gh-legacy-id",
        GITHUB_CLIENT_SECRET: "gh-legacy-secret",
      },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );
    expect(withLegacy.oauth?.github?.clientId).toBe("gh-legacy-id");
    expect(withLegacy.oauth?.github?.clientSecret).toBe("gh-legacy-secret");
  });

  it("omits GitHub OAuth when only one of client id and secret is set", () => {
    const config = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        AUTH_GITHUB_CLIENT_ID: "gh-id-only",
      },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );
    expect(config.oauth?.github).toBeUndefined();
  });

  it("throws when required secrets are missing", () => {
    expect(() =>
      buildSecureAuthConfigFromEnv(
        { APP_BASE_URL: "http://localhost:3001" },
        { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
      )
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it("builds public UI config without server secrets", () => {
    const config = buildSecureAuthUiPublicConfigFromEnv(
      { APP_BASE_URL: "http://localhost:3001", PASSWORD_MIN_LENGTH: "10" },
      { appName: "SelahKeep", appSlug: "letters-to-god", baseUrl: "http://localhost:3001" }
    );

    expect(config.appName).toBe("SelahKeep");
    expect(config.passwordPolicy.minLength).toBe(10);
    expect(config.paths.afterLogin).toBe("/notes");
    expect(config.messages.loginDescription).toBe("Sign in to continue to your account.");
  });

  it("clamps invalid numeric env values to defaults", () => {
    const config = buildSecureAuthConfigFromEnv(
      {
        ...baseEnv,
        AUTH_PASSWORD_MIN_LENGTH: "not-a-number",
        AUTH_SESSION_REVOCATION_POLL_SECONDS: "99999",
      },
      { appName: "Test", appSlug: "test", baseUrl: "http://localhost:3001" }
    );

    expect(config.passwordPolicy?.minLength).toBe(12);
    expect(config.sessions?.revocationPollIntervalSeconds).toBe(3600);
  });

  it("maps product auth page messages into ui config", () => {
    const config = buildSecureAuthConfigFromEnv(baseEnv, {
      appName: "SelahKeep",
      appSlug: "letters-to-god",
      baseUrl: "http://localhost:3001",
    });

    expect(config.ui?.messages?.loginDescription).toBe("Sign in to continue to your account.");
    expect(config.ui?.messages?.registerDescription).toBe(
      "Start writing private notes in a protected space."
    );
  });
});
