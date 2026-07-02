import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  VaultAutoLockNotice,
  VAULT_INACTIVITY_LOCK_MESSAGE,
} from "@/features/vault/vault-auto-lock-notice";

describe("VaultAutoLockNotice", () => {
  it("is disabled (vault status is shown in the header dock only)", () => {
    render(<VaultAutoLockNotice />);
    expect(screen.queryByText(VAULT_INACTIVITY_LOCK_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
