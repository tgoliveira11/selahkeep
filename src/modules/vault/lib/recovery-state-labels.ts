import type { VaultStatus } from "@/lib/api-client/vault";

export type RecoveryStateLabel = {
  label: string;
  description: string;
  variant: "success" | "warning" | "danger";
};

export function getRecoveryStateLabel(
  state: VaultStatus["recoveryState"] | undefined
): RecoveryStateLabel | null {
  if (!state) return null;
  switch (state) {
    case "Protected":
      return {
        label: "Well protected",
        description: "You have more than one way to recover your private notes.",
        variant: "success",
      };
    case "Basic":
      return {
        label: "Basic protection",
        description:
          "Consider adding a recovery phrase or passkey so you can access your notes on a new device.",
        variant: "warning",
      };
    case "At Risk":
      return {
        label: "Needs attention",
        description:
          "Set up a recovery phrase or passkey soon. If you lose this device, your notes may be unrecoverable.",
        variant: "danger",
      };
    default:
      return {
        label: "Unknown",
        description: "Check your recovery settings when you can.",
        variant: "warning",
      };
  }
}
