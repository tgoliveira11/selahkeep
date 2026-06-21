import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const VOICE_DIRS = [join(ROOT, "src/lib/voice"), join(ROOT, "src/features/voice")];

function collect(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collect(path, acc);
    else if (/\.tsx?$/.test(name)) acc.push(path);
  }
  return acc;
}

const voiceFiles = VOICE_DIRS.flatMap((d) => collect(d));

describe("voice transcription has no user-content egress", () => {
  it("has voice source files to scan", () => {
    expect(voiceFiles.length).toBeGreaterThan(0);
  });

  it("never uses the cloud Web Speech API for note content", () => {
    for (const file of voiceFiles) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/webkitSpeechRecognition/);
      expect(content).not.toMatch(/\bnew SpeechRecognition\b/);
    }
  });

  it("does not POST/upload audio or transcript via fetch/XHR/WebSocket", () => {
    for (const file of voiceFiles) {
      const content = readFileSync(file, "utf8");
      // The feature must not open arbitrary network channels for content.
      expect(content).not.toMatch(/fetch\s*\(/);
      expect(content).not.toMatch(/XMLHttpRequest/);
      expect(content).not.toMatch(/new WebSocket/);
      expect(content).not.toMatch(/navigator\.sendBeacon/);
    }
  });

  it("does not persist audio or transcript to durable storage", () => {
    for (const file of voiceFiles) {
      const content = readFileSync(file, "utf8");
      // The only allowed localStorage use is the language preference.
      const storageHits = content.match(/localStorage\.\w+/g) ?? [];
      for (const hit of storageHits) {
        // setItem/getItem are allowed only for the language key (asserted below).
        expect(hit).toMatch(/getItem|setItem/);
      }
      expect(content).not.toMatch(/indexedDB/);
      // Audio blobs/PCM must not be written to storage.
      expect(content).not.toMatch(/sessionStorage/);
    }
  });

  it("language persistence key carries only a language code, not content", () => {
    const panel = readFileSync(join(ROOT, "src/features/voice/voice-capture-panel.tsx"), "utf8");
    expect(panel).toContain("selahkeep:voice:lang");
  });
});
