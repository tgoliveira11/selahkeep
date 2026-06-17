/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrivacyNotice } from "@/modules/vault/components/privacy-notice";

describe("privacy notice", () => {
  it("renders compact note-editor copy for marketing flows", () => {
    render(<PrivacyNotice compact />);
    expect(
      screen.getByText(/your note is protected on this device before it is saved/i)
    ).toBeTruthy();
  });

  it("renders full alert variant for editor contexts", () => {
    render(<PrivacyNotice />);
    expect(screen.getByText(/your privacy/i)).toBeTruthy();
    expect(screen.getByText(/protected on your device before they are saved/i)).toBeTruthy();
  });
});
