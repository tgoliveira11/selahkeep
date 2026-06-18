/** Standard authenticated page max-width classes — see docs/UI_UX_DIRECTION.md */
export const AUTHENTICATED_WIDTH_CLASS = {
  settings: "max-w-[800px]",
  notes: "max-w-[920px]",
  editor: "max-w-[880px]",
} as const;

export type AuthenticatedLayoutWidth = keyof typeof AUTHENTICATED_WIDTH_CLASS;
