/**
 * Decode an uploaded audio file to mono 16 kHz Float32 PCM for Whisper.
 *
 * Uses the browser's Web Audio `decodeAudioData`, which natively handles the
 * common formats (mp3, wav, m4a/aac, ogg, flac, webm) per the platform's codecs.
 * Everything stays in memory on the device — the file is never uploaded.
 */

import { mixToMono, resampleLinear, WHISPER_SAMPLE_RATE } from "@/lib/voice/audio-pcm";

/**
 * Common audio types we advertise in the file picker (decoding is codec-gated).
 * Includes m4a explicitly by extension and by its several reported MIME types
 * (`audio/x-m4a`, `audio/m4a`, `audio/mp4`, `audio/aac`) so the picker reliably
 * offers `.m4a`/AAC files across browsers and operating systems.
 */
export const ACCEPTED_AUDIO_TYPES = [
  "audio/*",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".oga",
  ".flac",
  ".webm",
  ".mp4",
].join(",");

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

/**
 * Decode with the modern Promise form, falling back to the legacy callback form
 * (older Safari). Normalises whatever the browser throws into a clear Error.
 */
function decodeAudioData(ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const onError = (err: unknown) =>
      reject(
        err instanceof Error
          ? err
          : new Error(
              typeof err === "string"
                ? err
                : (err as { message?: string })?.message ?? "Unable to decode audio data"
            )
      );
    let maybePromise: Promise<AudioBuffer> | undefined;
    try {
      maybePromise = ctx.decodeAudioData(buffer, resolve, onError);
    } catch (err) {
      onError(err);
      return;
    }
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(resolve, onError);
    }
  });
}

/** Decode a File with the browser's native codecs (fast path). */
async function decodeWithWebAudio(file: File): Promise<Float32Array> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Audio decoding is not supported in this browser.");

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error("The file is empty.");
  const ctx = new Ctor();
  try {
    const audioBuffer = await decodeAudioData(ctx, arrayBuffer);
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }
    const mono = mixToMono(channels);
    const pcm = resampleLinear(mono, audioBuffer.sampleRate, WHISPER_SAMPLE_RATE);
    // Ensure a standalone buffer so it can be transferred to the worker.
    return pcm.buffer === mono.buffer ? new Float32Array(pcm) : pcm;
  } finally {
    if (ctx.state !== "closed") void ctx.close();
  }
}

const LARGE_FILE_BYTES = 25 * 1_048_576; // 25 MB

async function decodeViaWebCodecs(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<Float32Array> {
  const { decodeAudioFileViaWebCodecs } = await import("@/lib/voice/audio-webcodecs");
  return decodeAudioFileViaWebCodecs(file, onProgress);
}

async function decodeViaFfmpeg(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<Float32Array> {
  const { decodeAudioFileViaFfmpeg } = await import("@/lib/voice/audio-ffmpeg");
  return decodeAudioFileViaFfmpeg(file, onProgress);
}

/**
 * Decode a File into mono 16 kHz PCM, on-device, via a fallback ladder:
 *
 * 1. **Native `decodeAudioData`** — fast/simplest for small files (it OOMs on
 *    large ones, so large files skip it).
 * 2. **WebCodecs + mediabunny** — streams the file and decodes with native
 *    codecs (handles large AAC/MP3/Opus/etc. without exhausting memory).
 * 3. **ffmpeg.wasm** — universal last resort for codecs the platform can't
 *    decode (ALAC / Apple Lossless from iPhone Voice Memos, WMA, AMR, AIFF…);
 *    downloaded once on demand.
 *
 * `onProgress` reports 0..1 during the streamed (WebCodecs/ffmpeg) decode.
 */
export async function decodeAudioFileToPcm(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<Float32Array> {
  const webCodecs = typeof window !== "undefined" && "AudioDecoder" in window;
  const large = file.size > LARGE_FILE_BYTES;

  // 1. Native — only for small files (large ones OOM `decodeAudioData`).
  if (!large) {
    try {
      const pcm = await decodeWithWebAudio(file);
      onProgress?.(1);
      return pcm;
    } catch (err) {
      console.warn("[audio-upload] native decode failed; trying WebCodecs", err);
    }
  }

  // 2. WebCodecs (streamed, native codecs).
  if (webCodecs) {
    try {
      return await decodeViaWebCodecs(file, onProgress);
    } catch (err) {
      console.warn("[audio-upload] WebCodecs decode failed; trying ffmpeg", err);
    }
  }

  // 3. ffmpeg.wasm — universal fallback (ALAC, etc.).
  try {
    return await decodeViaFfmpeg(file, onProgress);
  } catch (err) {
    console.error("[audio-upload] ffmpeg decode failed", err);
    throw err;
  }
}
