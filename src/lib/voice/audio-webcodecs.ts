"use client";

/**
 * Universal on-device audio decoder via WebCodecs (`AudioDecoder`) driven by the
 * `mediabunny` demuxer. This is the fallback for files the browser's
 * `decodeAudioData` can't handle in one shot — notably large recordings (e.g. a
 * 100 MB+ iPhone Voice Memo), which it decodes natively, codec-by-codec, while
 * streaming the file so memory stays bounded.
 *
 * Uses the platform's native codecs (no multi-MB wasm download) and never sends
 * the audio anywhere. See `docs/TDR_Local_Voice_Notes.md`.
 */

import { ALL_FORMATS, AudioBufferSink, BlobSource, Input } from "mediabunny";
import { mixToMono, resampleLinear, WHISPER_SAMPLE_RATE } from "@/lib/voice/audio-pcm";

/** True when the browser can decode audio via WebCodecs. */
export function hasWebCodecsAudio(): boolean {
  return typeof globalThis !== "undefined" && "AudioDecoder" in globalThis;
}

/**
 * Decode any mediabunny-supported file (mp4/m4a, mp3, wav, ogg/opus, flac,
 * webm…) into mono 16 kHz Float32 PCM. Streams the input and resamples each
 * decoded block, pre-allocating the output by duration so a multi-hour file
 * doesn't double its memory. `onProgress` reports 0..1 as it decodes.
 */
export async function decodeAudioFileViaWebCodecs(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<Float32Array> {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const track = await input.getPrimaryAudioTrack();
  if (!track) throw new Error("No audio track was found in this file.");
  if (!(await track.canDecode())) {
    throw new Error("This audio codec can't be decoded in this browser.");
  }

  const duration = await track.computeDuration(); // seconds
  // Pre-allocate by duration (+1s margin); any trailing silence is harmless to
  // Whisper and this avoids a second full-size allocation at the end.
  const capacity = Math.max(WHISPER_SAMPLE_RATE, Math.ceil((duration + 1) * WHISPER_SAMPLE_RATE));
  const out = new Float32Array(capacity);
  let written = 0;

  const sink = new AudioBufferSink(track);
  for await (const { buffer } of sink.buffers()) {
    const channels: Float32Array[] = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }
    const mono = mixToMono(channels);
    const resampled =
      buffer.sampleRate === WHISPER_SAMPLE_RATE
        ? mono
        : resampleLinear(mono, buffer.sampleRate, WHISPER_SAMPLE_RATE);

    const room = capacity - written;
    if (room <= 0) break;
    const n = Math.min(resampled.length, room);
    out.set(resampled.subarray(0, n), written);
    written += n;

    if (onProgress && duration > 0) {
      onProgress(Math.min(1, written / WHISPER_SAMPLE_RATE / duration));
    }
  }

  if (written === 0) throw new Error("Decoded audio was empty.");
  onProgress?.(1);
  // A view over the (possibly slightly larger) buffer; transferring out.buffer
  // hands the worker exactly `written` samples without copying.
  return out.subarray(0, written);
}
