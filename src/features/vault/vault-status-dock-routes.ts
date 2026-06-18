/** True when the user is on the full-page vault unlock route. */
export function isVaultFullUnlockPage(pathname: string): boolean {
  return pathname === "/vault/unlock";
}
