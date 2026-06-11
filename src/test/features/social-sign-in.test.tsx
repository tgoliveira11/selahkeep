/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { MICROSOFT_OAUTH_PROVIDER_ID } from "@/modules/auth/lib/microsoft-provider-config";

const signIn = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

describe("SocialSignIn", () => {
  beforeEach(() => {
    signIn.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          google: {},
          apple: {},
          [MICROSOFT_OAUTH_PROVIDER_ID]: {},
        }),
      }))
    );
  });

  it("renders only providers returned by NextAuth", async () => {
    const { container } = render(<SocialSignIn />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue with google/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /continue with apple/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeTruthy();
    });
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3);
  });

  it("hides Microsoft when azure-ad is not registered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ google: {}, apple: {} }),
      }))
    );

    render(<SocialSignIn />);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /continue with microsoft/i })).toBeNull();
    });
  });

  it("starts Microsoft OAuth with the azure-ad provider id", async () => {
    render(<SocialSignIn />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /continue with microsoft/i })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /continue with microsoft/i }));
    expect(signIn).toHaveBeenCalledWith(MICROSOFT_OAUTH_PROVIDER_ID, {
      callbackUrl: "/letters",
    });
  });
});
