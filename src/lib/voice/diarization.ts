/**
 * Pure helpers to turn Whisper word timestamps + speaker segments into a
 * speaker-labelled transcript ("[Person one] …\n\n[Person two] …").
 *
 * No DOM, no models, no network — just data shaping, so it is unit-testable and
 * contains no user-content egress. The actual models (Whisper word timestamps
 * and the pyannote segmentation model) run on-device in the transcription
 * worker; this module only merges their outputs.
 */

/** A transcribed word with its time span (seconds). */
export type DiarWord = { text: string; start: number; end: number };

/** A speaker-active span (seconds) produced by the segmentation model. */
export type DiarSegment = { id: string | number; start: number; end: number };

/** A run of consecutive words attributed to one speaker. */
export type SpeakerTurn = { speaker: number; text: string };

const SPOKEN_NUMBERS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
] as const;

/** Human label for a zero-based speaker index, e.g. 0 → "Person one". */
export function speakerLabel(index: number): string {
  const word = SPOKEN_NUMBERS[index] ?? String(index + 1);
  return `Person ${word}`;
}

/** Speaker id of the segment covering `time`, else the nearest segment's id. */
function speakerIdForTime(time: number, segments: DiarSegment[]): string | number | null {
  let nearest: string | number | null = null;
  let nearestDistance = Infinity;
  for (const seg of segments) {
    if (time >= seg.start && time <= seg.end) return seg.id;
    const distance = time < seg.start ? seg.start - time : time - seg.end;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = seg.id;
    }
  }
  return nearest;
}

/**
 * Attribute each word to a speaker (by the word's midpoint) and group
 * consecutive same-speaker words into turns. Speaker ids are remapped to stable
 * zero-based indices in order of first appearance (so the first voice heard is
 * "Person one").
 */
export function mergeWordsWithSpeakers(
  words: DiarWord[],
  segments: DiarSegment[]
): SpeakerTurn[] {
  const idToIndex = new Map<string | number, number>();
  const turns: SpeakerTurn[] = [];

  for (const word of words) {
    const text = word.text.trim();
    if (!text) continue;

    const midpoint = (word.start + word.end) / 2;
    const rawId = speakerIdForTime(midpoint, segments);
    const key = rawId ?? "__unknown__";
    if (!idToIndex.has(key)) idToIndex.set(key, idToIndex.size);
    const speaker = idToIndex.get(key)!;

    const last = turns[turns.length - 1];
    if (last && last.speaker === speaker) {
      last.text = `${last.text} ${text}`;
    } else {
      turns.push({ speaker, text });
    }
  }

  return turns;
}

/**
 * Build a speaker-labelled transcript. Returns "" when there is nothing to label
 * or only a single speaker was detected (the caller then uses the plain
 * transcript instead — labels would add noise for a monologue).
 */
export function formatDiarizedText(words: DiarWord[], segments: DiarSegment[]): string {
  if (!words.length || !segments.length) return "";

  const turns = mergeWordsWithSpeakers(words, segments);
  const distinctSpeakers = new Set(turns.map((turn) => turn.speaker));
  if (turns.length === 0 || distinctSpeakers.size < 2) return "";

  return turns
    .map((turn) => `[${speakerLabel(turn.speaker)}] ${turn.text.trim()}`)
    .join("\n\n");
}
