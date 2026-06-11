export function formatAuthProvider(provider: string): string {
  switch (provider) {
    case "credentials":
      return "Email and password";
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    default:
      return provider;
  }
}
