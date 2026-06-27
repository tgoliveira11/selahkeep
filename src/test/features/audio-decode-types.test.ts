import { describe, it, expect } from "vitest";
import { ACCEPTED_AUDIO_TYPES } from "@/lib/voice/audio-decode";

describe("accepted audio upload types", () => {
  const types = ACCEPTED_AUDIO_TYPES.split(",");

  it("offers m4a by extension and by its reported MIME types", () => {
    expect(types).toContain(".m4a");
    expect(types).toContain("audio/x-m4a");
    expect(types).toContain("audio/m4a");
    expect(types).toContain("audio/mp4");
  });

  it("still offers the other common formats", () => {
    for (const ext of [".mp3", ".wav", ".aac", ".ogg", ".flac", ".webm"]) {
      expect(types).toContain(ext);
    }
    expect(types).toContain("audio/*");
  });
});
