/** @vitest-environment happy-dom */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildRecoveryPhraseDownloadContent,
  downloadRecoveryPhraseFile,
  RECOVERY_PHRASE_DOWNLOAD_FILENAME,
} from "@/lib/crypto-client/recovery-phrase-download";

describe("recovery phrase download", () => {
  const phrase =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  it("builds numbered txt content in exact order", () => {
    const content = buildRecoveryPhraseDownloadContent(phrase);
    expect(content).toContain("SelahKeep recovery phrase");
    expect(content).toContain("1. abandon");
    expect(content).toContain("12. about");
    expect(content.indexOf("1. abandon")).toBeLessThan(content.indexOf("12. about"));
    expect(content).toContain("Anyone with this phrase can unlock your vault.");
  });

  it("uses the selahkeep recovery phrase filename", () => {
    expect(RECOVERY_PHRASE_DOWNLOAD_FILENAME).toBe("selahkeep-recovery-phrase.txt");
  });

  it("includes all 24 words for a 24-word phrase", () => {
    const words = Array.from({ length: 24 }, (_, index) => `word${index + 1}`).join(" ");
    const content = buildRecoveryPhraseDownloadContent(words);
    expect(content).toContain("24. word24");
    expect(content).toContain("1. word1");
  });

  it("downloads a txt file client-side without network calls", () => {
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    const remove = vi.spyOn(HTMLElement.prototype, "remove").mockImplementation(() => undefined);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:recovery");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, "createElement").mockReturnValue({
      click,
      remove,
    } as unknown as HTMLAnchorElement);

    downloadRecoveryPhraseFile(phrase);

    expect(createElement).toHaveBeenCalledWith("a");
    expect(click).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
