import { isKanbanEnabled } from "@/lib/notes/kanban-config";

/** Logged-in primary navigation for SelahKeep. */

export type LoggedInNavGroup = "core" | "vault" | "account";

export type LoggedInNavLink = {
  href: string;
  label: string;
  group: LoggedInNavGroup;
};

/** Primary links shown when the user is signed in (desktop + mobile). */
export const LOGGED_IN_NAV_LINKS: readonly LoggedInNavLink[] = [
  { href: "/notes", label: "Notes", group: "core" },
  { href: "/kanban", label: "Boards", group: "core" },
  { href: "/vault/settings", label: "Vault", group: "vault" },
  { href: "/settings/account", label: "Account", group: "account" },
] as const;

export function getLoggedInNavLinks(): readonly LoggedInNavLink[] {
  return LOGGED_IN_NAV_LINKS.filter((link) => link.href !== "/kanban" || isKanbanEnabled());
}

export function isLoggedInNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/notes") {
    return pathname === "/notes" || pathname.startsWith("/notes/");
  }
  if (href === "/kanban") {
    return pathname === "/kanban" || pathname.startsWith("/kanban/");
  }
  if (href === "/vault/settings") {
    return (
      pathname === "/vault/settings" ||
      pathname.startsWith("/vault/settings/") ||
      pathname === "/vault/security" ||
      pathname.startsWith("/vault/security/") ||
      pathname === "/vault/unlock" ||
      pathname.startsWith("/vault/unlock/") ||
      pathname === "/vault/setup" ||
      pathname.startsWith("/vault/setup/") ||
      pathname === "/vault/recovery" ||
      pathname.startsWith("/vault/recovery/")
    );
  }
  if (href === "/settings/account") {
    return (
      pathname === "/settings/account" ||
      pathname.startsWith("/settings/account/") ||
      pathname === "/settings/security" ||
      pathname.startsWith("/settings/security/") ||
      pathname === "/settings/integrations" ||
      pathname.startsWith("/settings/integrations/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
