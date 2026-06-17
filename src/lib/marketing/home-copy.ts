import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";

/** Marketing copy for the public home page (`/`). */
export const homeCopy = {
  hero: {
    eyebrow: "Your private encrypted vault",
    title: PRODUCT_NAME,
    subtitle: PRODUCT_TAGLINE,
    reassurance:
      "Your notes are private by default and protected on your device before they are saved.",
  },
  features: {
    heading: "What you can do",
    cards: [
      {
        title: "Write privately",
        description:
          "Compose prayers, reflections, and notes in a calm, distraction-free space.",
      },
      {
        title: "Keep everything in one vault",
        description:
          "Save your writing securely and return whenever you want to remember, reflect, or find comfort.",
      },
      {
        title: "Mark as answered",
        description:
          "When a prayer or reflection feels answered, mark it so you can revisit that moment of peace and gratitude.",
      },
      {
        title: "Recover thoughtfully",
        description:
          "Set up a vault password, recovery phrase, or passkey so you can unlock your vault on a new browser or device.",
      },
    ],
  },
  privacy: {
    heading: "Your privacy, in plain language",
    body: [
      "Your vault belongs to you. Notes are private by default, and we design the app so our team cannot read them.",
      "When you save a note, it is protected before it leaves your browser. Only you can unlock and read your private notes after vault unlock.",
      "Your account password signs you in only — it does not unlock your vault. Vault recovery is separate.",
      "We do not sell your note content, use it for advertising, or share it with others.",
      "Import and export are not available in this MVP. There is no way to bulk-download decrypted notes from the server.",
    ],
  },
  deferred: {
    heading: "Not in this MVP",
    badge: "Coming later",
    body:
      "Encrypted attachments, note version history, import/export, and optional community sharing are planned for future phases. They are not available today.",
  },
  account: {
    heading: "Why create an account?",
    body: [
      "An account keeps your vault tied to you across visits and devices, with sign-in options you can trust.",
      "It also lets you set up vault recovery so you are not locked out if you switch browsers or lose a device.",
      "Deleting your account permanently removes your vault and all encrypted notes stored with it.",
    ],
  },
  finalCta: {
    heading: "Start your private vault",
    subtitle: "Create a free account, set up your vault, and write your first note in a calm, protected space.",
  },
} as const;
