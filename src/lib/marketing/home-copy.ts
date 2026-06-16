/** Marketing copy for the public home page (`/`). */
export const homeCopy = {
  hero: {
    eyebrow: "A quiet place for private letters",
    title: "Letters to God",
    subtitle:
      "A private place to write personal letters, keep them safely, revisit them over time, and reflect on what matters to you.",
    reassurance: "Your letters are private by default and protected before they are saved.",
  },
  features: {
    heading: "What you can do",
    cards: [
      {
        title: "Write privately",
        description:
          "Compose personal letters in a calm, distraction-free space. Take your time and write what is on your heart.",
      },
      {
        title: "Keep your letters",
        description:
          "Save your letters securely and return to them whenever you want to remember, reflect, or find comfort.",
      },
      {
        title: "Mark as answered",
        description:
          "When a prayer or letter feels answered, mark it so you can revisit that moment of peace and gratitude.",
      },
      {
        title: "Recover thoughtfully",
        description:
          "Set up a recovery code or trusted device so you can access your letters again on a new browser or device.",
      },
    ],
  },
  privacy: {
    heading: "Your privacy, in plain language",
    body: [
      "Your letters belong to you. They are private by default, and we design the app so our team cannot read them.",
      "When you save a letter, it is protected before it leaves your browser. Only you can unlock and read your private letters on a trusted device.",
      "We do not sell your letter content, use it for advertising, or share it with others.",
    ],
  },
  community: {
    heading: "Community — coming later",
    badge: "Not available yet",
    body:
      "We may someday offer a gentle way to share encouragement with others — always optional, always separate from your private letters. That feature is not live today.",
  },
  account: {
    heading: "Why create an account?",
    body: [
      "An account keeps your letters tied to you across visits and devices, with sign-in options you can trust.",
      "It also lets you set up recovery so you are not locked out of your letters if you switch browsers or lose a device.",
      "Your account password protects sign-in only — it does not replace your private letter recovery options.",
    ],
  },
  finalCta: {
    heading: "Start your private letter",
    subtitle: "Create a free account and write your first letter in a calm, protected space.",
  },
} as const;
