import { rejectPlaintextFields } from "@/lib/validation/plaintext-forbidden";

export function assertNoPlaintextFields(body: Record<string, unknown>): void {
  const error = rejectPlaintextFields(body);
  if (error) {
    throw new PlaintextRejectionError(error);
  }
}

export class PlaintextRejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaintextRejectionError";
  }
}
