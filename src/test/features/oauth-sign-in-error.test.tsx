/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OAuthSignInError } from "@/components/auth/oauth-sign-in-error";
import { OAUTH_SIGN_IN_ERROR_CODES } from "@/modules/auth/lib/oauth-sign-in-policy";

const useSearchParams = vi.fn(() => new URLSearchParams("error=OAuthSignin"));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParams(),
}));

describe("OAuthSignInError", () => {
  beforeEach(() => {
    useSearchParams.mockReturnValue(new URLSearchParams("error=OAuthSignin"));
  });

  it("shows a safe message for OAuthSignin configuration errors", () => {
    render(<OAuthSignInError />);
    expect(screen.getByRole("alert").textContent).toMatch(/application \(client\) id guid/i);
  });

  it("shows account-exists guidance", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams(`error=${OAUTH_SIGN_IN_ERROR_CODES.ACCOUNT_EXISTS}`)
    );
    render(<OAuthSignInError />);
    expect(screen.getByRole("alert").textContent).toMatch(/different sign-in method/i);
  });
});
