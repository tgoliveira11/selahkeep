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
  { href: "/vault/settings", label: "Vault", group: "vault" },
  { href: "/settings/account", label: "Account", group: "account" },
] as const;

export function isLoggedInNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/notes") {
    return pathname === "/notes" || pathname.startsWith("/notes/");
  }
  if (href === "/vault/settings") {
    return (
      pathname === "/vault/settings" ||
      pathname.startsWith("/vault/settings/") ||
      pathname === "/vault/unlock" ||
      pathname.startsWith("/vault/unlock/") ||
      pathname === "/vault/setup" ||
      pathname.startsWith("/vault/setup/")
    );
  }
  if (href === "/settings/account") {
    return (
      pathname === "/settings/account" ||
      pathname.startsWith("/settings/account/") ||
      pathname === "/settings/security" ||
      pathname.startsWith("/settings/security/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
