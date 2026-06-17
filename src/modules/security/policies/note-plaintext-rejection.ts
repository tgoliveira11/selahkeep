import { rejectPlaintextNoteFields } from "@/lib/validation/notes";
import {
  PlaintextRejectionError,
} from "@/modules/security/policies/plaintext-rejection";

export function assertNoPlaintextNoteFields(body: Record<string, unknown>): void {
  const error = rejectPlaintextNoteFields(body);
  if (error) {
    throw new PlaintextRejectionError(error);
  }
}

export { PlaintextRejectionError };
