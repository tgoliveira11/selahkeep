/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChangePasswordSettings } from "@/components/settings/change-password-settings";

describe("ChangePasswordSettings", () => {
  it("hides password form for Microsoft-only accounts", () => {
    render(<ChangePasswordSettings canChangePassword={false} authProvider="azure-ad" />);
    expect(screen.getByText(/signs in with google, apple, or microsoft/i)).toBeTruthy();
    expect(screen.queryByLabelText("Current password")).toBeNull();
  });
});
