import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  OUTPOST_HUB_LINKS,
  SECURE_AUTH_HUB_LINKS,
  VAULT_HUB_LINKS,
} from "@/lib/admin/admin-hub-links";

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
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { AdminNav } from "@/components/admin-nav";
import { AdminOverviewPage } from "@/components/admin-overview-page";

describe("AdminNav", () => {
  it("links secure-auth admin sections under AUTH_ADMIN_PATH", () => {
    render(<AdminNav outpostAdminBase="/admin/outpost" vaultAdminBase="/admin/vault" />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Config" })).toHaveAttribute("href", "/admin/config");
  });

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
  });

  it("links all Vault admin sections under VAULT_ADMIN_PATH", () => {
    render(<AdminNav outpostAdminBase="/admin/outpost" vaultAdminBase="/admin/vault" />);

    expect(screen.getByRole("link", { name: "Vault" })).toHaveAttribute("href", "/admin/vault");

    for (const link of VAULT_HUB_LINKS) {
      if (link.key === "vault") continue;
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        `/admin/vault${link.suffix}`
      );
    }
  });
});

describe("AdminOverviewPage", () => {
  it("lists every admin hub link from the header menu", () => {
    render(
      <AdminOverviewPage outpostAdminBase="/admin/outpost" vaultAdminBase="/admin/vault" />
    );

    const expectedHrefs = [
      ...SECURE_AUTH_HUB_LINKS.map((link) => `/admin${link.suffix}`),
      ...OUTPOST_HUB_LINKS.map((link) => `/admin/outpost${link.suffix}`),
      ...VAULT_HUB_LINKS.map((link) => `/admin/vault${link.suffix}`),
    ];

    const hrefs = new Set(
      screen.getAllByRole("link").map((element) => element.getAttribute("href"))
    );

    for (const href of expectedHrefs) {
      expect(hrefs.has(href)).toBe(true);
    }
    expect(hrefs.size).toBe(expectedHrefs.length);
  });
});
