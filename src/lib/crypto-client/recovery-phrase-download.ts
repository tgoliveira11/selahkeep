import { PRODUCT_NAME } from "@/lib/marketing/brand";

const RECOVERY_PHRASE_DOWNLOAD_FILENAME = "selahkeep-recovery-phrase.txt";

function normalizeWords(recoveryPhrase: string): string[] {
  return recoveryPhrase.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function buildRecoveryPhraseDownloadContent(recoveryPhrase: string): string {
  const words = normalizeWords(recoveryPhrase);
  const numberedWords = words.map((word, index) => `${index + 1}. ${word}`).join("\n");

  return [
    `${PRODUCT_NAME} recovery phrase`,
    "",
    "Keep this phrase somewhere safe. It can unlock your vault if you forget your vault password.",
    "",
    "Recovery phrase:",
    numberedWords,
    "",
    "Important:",
    "- Keep the words in this exact order.",
    "- SelahKeep cannot recover this phrase for you.",
    "- Anyone with this phrase can unlock your vault.",
  ].join("\n");
}

/** Triggers a client-side `.txt` download; phrase never leaves the browser except to the user's file system. */
export function downloadRecoveryPhraseFile(recoveryPhrase: string): void {
  const content = buildRecoveryPhraseDownloadContent(recoveryPhrase);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = RECOVERY_PHRASE_DOWNLOAD_FILENAME;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { RECOVERY_PHRASE_DOWNLOAD_FILENAME };
