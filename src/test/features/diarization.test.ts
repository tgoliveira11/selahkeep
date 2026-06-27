import { describe, it, expect } from "vitest";
import {
  formatDiarizedText,
  mergeWordsWithSpeakers,
  speakerLabel,
  type DiarSegment,
  type DiarWord,
} from "@/lib/voice/diarization";

describe("diarization helpers", () => {
  it("labels speakers as Person one, two, …", () => {
    expect(speakerLabel(0)).toBe("Person one");
    expect(speakerLabel(1)).toBe("Person two");
    expect(speakerLabel(9)).toBe("Person ten");
    expect(speakerLabel(10)).toBe("Person 11");
  });

  const words: DiarWord[] = [
    { text: " Hello", start: 0.0, end: 0.4 },
    { text: " there", start: 0.4, end: 0.8 },
    { text: " Hi", start: 1.6, end: 1.9 },
    { text: " friend", start: 1.9, end: 2.3 },
    { text: " Bye", start: 3.1, end: 3.4 },
  ];
  const segments: DiarSegment[] = [
    { id: "SPEAKER_00", start: 0.0, end: 1.0 },
    { id: "SPEAKER_01", start: 1.4, end: 2.6 },
    { id: "SPEAKER_00", start: 3.0, end: 3.6 },
  ];

  it("groups consecutive words by speaker and remaps ids by first appearance", () => {
    const turns = mergeWordsWithSpeakers(words, segments);
    expect(turns).toEqual([
      { speaker: 0, text: "Hello there" },
      { speaker: 1, text: "Hi friend" },
      { speaker: 0, text: "Bye" },
    ]);
  });

  it("formats a speaker-labelled transcript when 2+ speakers are present", () => {
    expect(formatDiarizedText(words, segments)).toBe(
      "[Person one] Hello there\n\n[Person two] Hi friend\n\n[Person one] Bye"
    );
  });

  it("returns empty (caller falls back to plain text) for a single speaker", () => {
    const mono: DiarSegment[] = [{ id: "SPEAKER_00", start: 0, end: 5 }];
    expect(formatDiarizedText(words, mono)).toBe("");
  });

  it("returns empty when there are no words or no segments", () => {
    expect(formatDiarizedText([], segments)).toBe("");
    expect(formatDiarizedText(words, [])).toBe("");
  });
});
