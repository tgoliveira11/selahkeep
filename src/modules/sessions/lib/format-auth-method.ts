import type { AccountAuthMethod } from "@/lib/account-session-types";

export function formatAuthMethod(method: AccountAuthMethod | string): string {
  switch (method) {
    case "password":
      return "Email and password";
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "microsoft":
      return "Microsoft";
    case "passkey":
      return "Passkey";
    default:
      return "Unknown";
  }
}
