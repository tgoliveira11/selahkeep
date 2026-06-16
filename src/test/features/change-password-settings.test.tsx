/** @vitest-environment happy-dom */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ChangePasswordSettings,
  SecureAuthUIProvider,
} from "@tgoliveira/secure-auth/react";
import {
  buildTestPasswordPolicyFromEnv,
  testSecureAuthUiConfig,
} from "@/test/helpers/secure-auth-ui-config";

function renderChangePassword(
  props: { canChangePassword: boolean; authProvider: string },
  passwordPolicy = buildTestPasswordPolicyFromEnv({ PASSWORD_MIN_LENGTH: "8" })
) {
  return render(
    <SecureAuthUIProvider
      config={{
        ...testSecureAuthUiConfig,
        passwordPolicy,
      }}
    >
      <ChangePasswordSettings {...props} />
    </SecureAuthUIProvider>
  );
}

describe("ChangePasswordSettings (package UI)", () => {
  it("hides password form for Microsoft-only accounts", () => {
    renderChangePassword({ canChangePassword: false, authProvider: "azure-ad" });
    expect(screen.getByText(/signs in with google, apple, github, or microsoft/i)).toBeTruthy();
    expect(screen.queryByLabelText("Current password")).toBeNull();
  });

  it("uses the package-resolved minimum length in password feedback", () => {
    renderChangePassword(
      { canChangePassword: true, authProvider: "credentials" },
      buildTestPasswordPolicyFromEnv({ PASSWORD_MIN_LENGTH: "5", AUTH_PASSWORD_MIN_LENGTH: "5" })
    );
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "1234" },
    });
    expect(screen.getByText("Use at least 5 characters.")).toBeTruthy();
  });
});
