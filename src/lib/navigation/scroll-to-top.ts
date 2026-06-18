/** Whether route navigation should reset window scroll (skip intentional hash anchors). */
export function shouldResetScrollOnRouteChange(hash: string): boolean {
  return hash.length === 0;
}

/** Scroll the window to the top of the page. */
export function scrollWindowToTop(): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
