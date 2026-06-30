import { rejectPlaintextKanbanFields } from "@/lib/validation/kanban";
import { PlaintextRejectionError } from "@/modules/security/policies/plaintext-rejection";

export function assertNoPlaintextKanbanFields(body: Record<string, unknown>): void {
  const error = rejectPlaintextKanbanFields(body);
  if (error) {
    throw new PlaintextRejectionError(error);
  }
}

export { PlaintextRejectionError };
