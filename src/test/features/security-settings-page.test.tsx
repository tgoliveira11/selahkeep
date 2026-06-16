import { describe, it, expect } from "vitest";
import SecuritySettingsRedirectPage from "@/app/(vault)/settings/security/page";

describe("security settings redirect", () => {
  it("redirects legacy /settings/security to the combined account page", () => {
    expect(() => SecuritySettingsRedirectPage()).toThrow(/NEXT_REDIRECT/);
  });
});
