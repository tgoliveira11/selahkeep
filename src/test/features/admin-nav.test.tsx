/** @vitest-environment happy-dom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@tgoliveira/secure-auth/react", () => ({
  useUiPaths: () => ({
    adminPanel: "/admin",
    afterLogin: "/notes",
    login: "/login",
  }),
  Button: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { AdminNav } from "@/components/admin-nav";

describe("AdminNav", () => {
  it("links Outpost sections under OUTPOST_ADMIN_PATH", () => {
    render(<AdminNav outpostAdminBase="/admin/outpost" vaultAdminBase="/admin/vault" />);

    expect(screen.getByRole("link", { name: "Outpost" })).toHaveAttribute(
      "href",
      "/admin/outpost"
    );
    expect(screen.getByRole("link", { name: "Email queue" })).toHaveAttribute(
      "href",
      "/admin/outpost/queue"
    );
    expect(screen.getByRole("link", { name: "Email config" })).toHaveAttribute(
      "href",
      "/admin/outpost/config"
    );
    expect(screen.getByRole("link", { name: "Observability" })).toHaveAttribute(
      "href",
      "/admin/outpost/observability"
    );
  });

  it("links Vault admin sections when showVaultAdmin is true", () => {
    render(
      <AdminNav
        outpostAdminBase="/admin/outpost"
        vaultAdminBase="/admin/vault"
        showVaultAdmin
      />
    );

    expect(screen.getByRole("link", { name: "Vault" })).toHaveAttribute("href", "/admin/vault");
    expect(screen.getByRole("link", { name: "Vault config" })).toHaveAttribute(
      "href",
      "/admin/vault/config"
    );
    expect(screen.getByRole("link", { name: "Vault env" })).toHaveAttribute(
      "href",
      "/admin/vault/env-template"
    );
    expect(screen.getByRole("link", { name: "Vault security" })).toHaveAttribute(
      "href",
      "/admin/vault/security"
    );
  });

  it("hides Vault admin links when showVaultAdmin is false", () => {
    render(
      <AdminNav
        outpostAdminBase="/admin/outpost"
        vaultAdminBase="/admin/vault"
        showVaultAdmin={false}
      />
    );

    expect(screen.queryByRole("link", { name: "Vault" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Vault config" })).toBeNull();
  });
});
