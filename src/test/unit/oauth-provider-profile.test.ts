import { describe, it, expect } from "vitest";
import { mapMicrosoftOAuthProfile } from "@/modules/auth/lib/oauth-provider-profile";

describe("mapMicrosoftOAuthProfile", () => {
  it("maps identity claims without requesting Microsoft Graph photo data", () => {
    const profile = mapMicrosoftOAuthProfile({
      sub: "provider-subject",
      nickname: "nick",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/photo.jpg",
    });

    expect(profile).toEqual({
      id: "provider-subject",
      name: "Test User",
      email: "user@example.com",
      image: null,
    });
  });
});
