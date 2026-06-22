import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";

/** Marketing copy for the public home page (`/`). */
export const homeCopy = {
  hero: {
    eyebrow: "Pause and keep what matters",
    title: PRODUCT_NAME,
    subtitle: PRODUCT_TAGLINE,
    reassurance:
      "A calm, encrypted vault for reflection, prayer, journaling, and remembrance — private by default, protected on your device before anything is saved.",
  },
  features: {
    heading: "What you can do",
    cards: [
      {
        title: "Pause and reflect",
        description:
          "Write prayers, reflections, journal entries, and remembrance notes in a quiet space built for thoughtful keeping.",
      },
      {
        title: "Keep everything in one vault",
        description:
          "Return whenever you need comfort, clarity, or a record of what you wanted to remember — all encrypted before it leaves your browser.",
      },
      {
        title: "Mark as resolved",
        description:
          "When a prayer, reflection, or decision feels complete, mark it resolved so you can revisit that moment later.",
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
      "Your vault belongs to you. Notes are private by default, and we design SelahKeep so our team cannot read them.",
      "When you save a note, it is encrypted before it leaves your browser. Only you can unlock and read your private notes after vault unlock.",
      "Your account password signs you in only — it does not unlock your vault. Vault recovery is separate.",
      "Voice dictation runs on your device when enabled; audio and transcripts are not uploaded for note content.",
      "We do not sell your note content, use it for advertising, or share it with others.",
    ],
  },
  deferred: {
    heading: "Not in this MVP",
    badge: "Coming later",
    body:
      "Import/export, optional community sharing, and advanced collaboration are planned for future phases.",
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
    subtitle:
      "Create a free account, set up your vault, and keep your first note in a calm, protected space.",
  },
} as const;
