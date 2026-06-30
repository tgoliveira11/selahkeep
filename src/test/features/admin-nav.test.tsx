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
    render(<AdminNav outpostAdminBase="/admin/outpost" />);

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
});
