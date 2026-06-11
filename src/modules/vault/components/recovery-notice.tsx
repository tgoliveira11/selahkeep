import { Alert } from "@/modules/ui/primitives/alert";

export function RecoveryNotice() {
  return (
    <Alert variant="warning" title="Save your recovery code">
      If you lose this device and have not set up another way to recover your vault, your private
      letters cannot be restored. We cannot recover them for you.
    </Alert>
  );
}
