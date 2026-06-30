import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing/brand";

/** Marketing copy for the public home page (`/`). */
export const homeCopy = {
  hero: {
    eyebrow: "Pause and keep what matters",
    title: PRODUCT_NAME,
    subtitle: PRODUCT_TAGLINE,
    reassurance:
      "Your notes, prayers, and reflections are encrypted on your device before anything is saved. SelahKeep is built so our team cannot read your vault — only you can, after you unlock it.",
  },
  features: {
    heading: "What you can do",
    cards: [
      {
        title: "Pause and reflect",
        description:
          "Write prayers, journal entries, weekly reflections, and remembrance notes in a calm space made for thoughtful keeping.",
      },
      {
        title: "Keep everything in one vault",
        description:
          "Store notes with categories, tags, attachments, and version history — all protected before they leave your browser.",
      },
      {
        title: "Mark as resolved",
        description:
          "When a prayer, reflection, or decision feels complete, mark it resolved so you can revisit that moment later.",
      },
      {
        title: "Organize with Kanban boards",
        description:
          "Turn a note into a private board, or create standalone boards for tasks and plans. Edits stay in sync between your note and the board.",
      },
      {
        title: "Dictate on your device",
        description:
          "Record your voice or upload an audio file and get text on your device — your recordings and transcripts are not sent to us.",
      },
      {
        title: "Recover thoughtfully",
        description:
          "Set up a vault password, recovery phrase, or vault passkey so you can unlock on a new browser or device when you need to.",
      },
    ],
  },
  security: {
    heading: "Sign in and unlock, separately",
    body: [
      "Your account gets you in — with a passkey, password, or optional two-step verification. That is separate from your vault.",
      "Your vault holds your private notes. It stays locked until you unlock it with your vault password, recovery phrase, or a passkey registered for the vault.",
      "Signing in does not decrypt your notes, and resetting your account password does not unlock your vault.",
    ],
  },
  privacy: {
    heading: "Your privacy, in plain language",
    body: [
      "Notes are encrypted on your device before they are saved. Our servers store only scrambled data — we cannot read your titles or words.",
      "Kanban boards and attachments follow the same rule: encrypted on your device, unreadable to us.",
      "Voice dictation and audio transcription run entirely on your device when enabled. We do not process your recordings or transcripts on our servers.",
      "We do not sell your content, use it for advertising, or train AI on your private notes.",
      "Your account password signs you in only — it does not unlock your vault. Vault recovery is separate.",
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
      "An account ties your vault to you across visits and devices, with sign-in options you can trust — including passkeys.",
      "Set up vault recovery so you are not locked out if you switch browsers or lose a device.",
      "Deleting your account permanently removes your vault and all encrypted notes stored with it.",
    ],
  },
  finalCta: {
    heading: "Start your private vault",
    subtitle:
      "Create a free account, set up your vault, and keep your first note in a calm, protected space.",
  },
} as const;
