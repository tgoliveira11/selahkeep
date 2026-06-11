import type { AzureADProfile } from "next-auth/providers/azure-ad";

/**
 * Maps Microsoft identity claims to NextAuth user fields without calling Microsoft Graph.
 * Default Azure AD provider fetches profile photos via Graph; we avoid that for minimal scope use.
 */
export function mapMicrosoftOAuthProfile(profile: AzureADProfile) {
  return {
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    image: null,
  };
}
