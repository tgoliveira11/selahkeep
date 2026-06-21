import { describe, it, expect } from "vitest";
import {
  VOICE_LANGUAGES,
  DEFAULT_VOICE_LANGUAGE,
  isSupportedVoiceLanguage,
  normalizeVoiceLanguage,
  voiceLanguageLabel,
} from "@/lib/voice/voice-languages";
import {
  mixToMono,
  resampleLinear,
  resampledLength,
  clampPcm,
  WHISPER_SAMPLE_RATE,
} from "@/lib/voice/audio-pcm";
import { formatTranscript, appendTranscript } from "@/lib/voice/transcript-format";
import {
  isVoiceNotesEnabled,
  getVoiceModelId,
  getVoiceModelHost,
  DEFAULT_VOICE_MODEL,
} from "@/lib/voice/voice-config";

describe("voice languages", () => {
  it("supports en, pt, es", () => {
    expect(VOICE_LANGUAGES.map((l) => l.code)).toEqual(["en", "pt", "es"]);
  });

  it("validates and normalizes language codes", () => {
    expect(isSupportedVoiceLanguage("pt")).toBe(true);
    expect(isSupportedVoiceLanguage("fr")).toBe(false);
    expect(normalizeVoiceLanguage("es")).toBe("es");
    expect(normalizeVoiceLanguage("fr")).toBe(DEFAULT_VOICE_LANGUAGE);
    expect(normalizeVoiceLanguage(null)).toBe(DEFAULT_VOICE_LANGUAGE);
  });

  it("labels languages", () => {
    expect(voiceLanguageLabel("pt")).toBe("Português");
    expect(voiceLanguageLabel("en")).toBe("English");
  });
});

describe("audio pcm", () => {
  it("mixes multiple channels to mono", () => {
    const mono = mixToMono([
      new Float32Array([0, 1, -1]),
      new Float32Array([0, -1, 1]),
    ]);
    expect(Array.from(mono)).toEqual([0, 0, 0]);
  });

  it("returns the single channel unchanged and empty for none", () => {
    const ch = new Float32Array([0.5]);
    expect(mixToMono([ch])).toBe(ch);
    expect(mixToMono([]).length).toBe(0);
  });

  it("computes resampled length", () => {
    expect(resampledLength(32_000, 32_000, 16_000)).toBe(16_000);
    expect(resampledLength(0, 0, 16_000)).toBe(0);
  });

  it("resamples down to the whisper rate", () => {
    const input = new Float32Array(48_000);
    const out = resampleLinear(input, 48_000, WHISPER_SAMPLE_RATE);
    expect(out.length).toBe(16_000);
  });

  it("returns input unchanged when rates match", () => {
    const input = new Float32Array([0.1, 0.2]);
    expect(resampleLinear(input, 16_000, 16_000)).toBe(input);
  });

  it("clamps out-of-range samples", () => {
    expect(Array.from(clampPcm(new Float32Array([2, -2, 0.5])))).toEqual([1, -1, 0.5]);
  });
});

describe("transcript format", () => {
  it("trims, collapses whitespace, and capitalizes", () => {
    expect(formatTranscript("  hello   world \n\n\n more ")).toBe("Hello world\n\nmore");
  });

  it("returns empty for whitespace-only", () => {
    expect(formatTranscript("   ")).toBe("");
  });

  it("appends with a blank-line separator", () => {
    expect(appendTranscript("existing", "new text")).toBe("existing\n\nNew text");
    expect(appendTranscript("", "new text")).toBe("New text");
    expect(appendTranscript("ends with newline\n", "tail")).toBe("ends with newline\nTail");
    expect(appendTranscript("keep", "   ")).toBe("keep");
  });
});

describe("voice config", () => {
  it("is enabled unless explicitly false", () => {
    expect(isVoiceNotesEnabled(undefined)).toBe(true);
    expect(isVoiceNotesEnabled("true")).toBe(true);
    expect(isVoiceNotesEnabled("false")).toBe(false);
  });

  it("resolves model id and host", () => {
    expect(getVoiceModelId(undefined)).toBe(DEFAULT_VOICE_MODEL);
    expect(getVoiceModelId("Xenova/whisper-tiny")).toBe("Xenova/whisper-tiny");
    expect(getVoiceModelHost(undefined)).toBeUndefined();
    expect(getVoiceModelHost("https://cdn.example.com")).toBe("https://cdn.example.com");
    expect(getVoiceModelHost("  ")).toBeUndefined();
  });
});
