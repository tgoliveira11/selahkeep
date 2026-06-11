export type PasskeyCapabilityLabel = "sign-in-only" | "sign-in-and-vault-unlock";

export function getPasskeyCapabilityLabel(input: {
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
}): PasskeyCapabilityLabel {
  if (input.signInEnabled && input.vaultUnlockEnabled) {
    return "sign-in-and-vault-unlock";
  }
  return "sign-in-only";
}

export function getPasskeyCapabilityDisplay(label: PasskeyCapabilityLabel): string {
  if (label === "sign-in-and-vault-unlock") {
    return "Sign-in + vault unlock";
  }
  return "Sign-in only";
}

export function isVaultRecoveryPasskey(input: {
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
}): boolean {
  return input.vaultUnlockEnabled;
}
