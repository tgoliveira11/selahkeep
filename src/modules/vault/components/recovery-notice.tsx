import { Alert } from "@/modules/ui/primitives/alert";

export function RecoveryNotice() {
  return (
    <Alert variant="warning" title="Save your recovery phrase">
      If you lose this device and have not saved your recovery phrase, your private notes cannot be
      restored. We cannot recover them for you.
    </Alert>
  );
}
