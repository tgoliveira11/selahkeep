/** Autosave and unsaved warnings activate only after user-originated edits. */
export function isDraftActivatedByUser(userStartedDraft: boolean): boolean {
  return userStartedDraft;
}
