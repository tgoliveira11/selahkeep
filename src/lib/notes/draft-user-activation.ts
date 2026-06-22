/** Tracks which fields the user edited — autosave activates only after real input. */
export type DraftUserActivation = {
  title: boolean;
  content: boolean;
  tags: boolean;
  manualCategory: boolean;
  attachments: boolean;
};

export const EMPTY_DRAFT_USER_ACTIVATION: DraftUserActivation = {
  title: false,
  content: false,
  tags: false,
  manualCategory: false,
  attachments: false,
};

export function isDraftActivatedByUser(activation: DraftUserActivation): boolean {
  return (
    activation.title ||
    activation.content ||
    activation.tags ||
    activation.manualCategory ||
    activation.attachments
  );
}

export function activateDraftField(
  activation: DraftUserActivation,
  field: keyof DraftUserActivation
): DraftUserActivation {
  if (activation[field]) return activation;
  return { ...activation, [field]: true };
}
