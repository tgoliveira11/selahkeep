/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  AppleLogo,
  GoogleLogo,
  MicrosoftLogo,
  OAuthProviderLogo,
} from "@/components/auth/oauth-provider-logos";

describe("oauth provider logos", () => {
  it("renders official brand marks as decorative SVGs", () => {
    const { container: google } = render(<GoogleLogo />);
    expect(google.querySelector('path[fill="#4285F4"]')).toBeTruthy();
    expect(google.querySelector('svg[aria-hidden="true"]')).toBeTruthy();

    const { container: apple } = render(<AppleLogo />);
    expect(apple.querySelector("svg")).toBeTruthy();

    const { container: microsoft } = render(<MicrosoftLogo />);
    expect(microsoft.querySelector('rect[fill="#F25022"]')).toBeTruthy();
    expect(microsoft.querySelector('rect[fill="#00A4EF"]')).toBeTruthy();
  });

  it("maps provider ids to the expected logo component", () => {
    const { container } = render(<OAuthProviderLogo providerId="google" />);
    expect(container.querySelector('path[fill="#EA4335"]')).toBeTruthy();
  });
});
