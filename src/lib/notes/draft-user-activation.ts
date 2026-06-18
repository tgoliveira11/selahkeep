/** Tracks which fields the user edited — autosave activates only after real input. */
export type DraftUserActivation = {
  title: boolean;
  content: boolean;
  tags: boolean;
  manualCategory: boolean;
};

export const EMPTY_DRAFT_USER_ACTIVATION: DraftUserActivation = {
  title: false,
  content: false,
  tags: false,
  manualCategory: false,
};

export function isDraftActivatedByUser(activation: DraftUserActivation): boolean {
  return (
    activation.title ||
    activation.content ||
    activation.tags ||
    activation.manualCategory
  );
}

export function activateDraftField(
  activation: DraftUserActivation,
  field: keyof DraftUserActivation
): DraftUserActivation {
  if (activation[field]) return activation;
  return { ...activation, [field]: true };
}
