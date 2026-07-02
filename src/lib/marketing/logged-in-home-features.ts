import { homeCopy } from "@/lib/marketing/home-copy";

/**
 * Logged-in `/home` feature highlights. Sourced from {@link homeCopy.features} plus
 * shipped product surfaces — update when adding user-visible capabilities (see CHANGELOG).
 */
export const loggedInHomeFeatures = {
  privacyHeading: homeCopy.privacy.heading,
  privacyPoints: homeCopy.privacy.body,
  featureHeading: homeCopy.features.heading,
  featureCards: [
    ...homeCopy.features.cards,
    {
      title: "Connect AI tools (MCP)",
      description:
        "Opt in to scoped integrations for Cursor, Claude Desktop, and Codex — share specific notes or boards with read or write access while keys stay on your device.",
    },
  ],
} as const;
