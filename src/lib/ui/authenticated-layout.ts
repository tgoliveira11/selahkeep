/** Standard authenticated page max-width classes — see docs/UI_UX_DIRECTION.md */
export const AUTHENTICATED_WIDTH_CLASS = {
  settings: "max-w-[800px]",
  // Notes list spans the full main column (mockup); centering/cap removed.
  notes: "max-w-none",
  editor: "max-w-[880px]",
} as const;

export type AuthenticatedLayoutWidth = keyof typeof AUTHENTICATED_WIDTH_CLASS;
