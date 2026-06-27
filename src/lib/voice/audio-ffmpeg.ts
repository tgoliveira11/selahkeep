"use client";

/**
 * Universal on-device audio decoder via ffmpeg.wasm — the last-resort fallback
 * for codecs neither the browser's `decodeAudioData` nor WebCodecs can handle
 * (notably **ALAC** / Apple Lossless `.m4a` from iPhone Voice Memos, plus WMA,
 * AMR, AIFF…).
 *
 * The heavy lifting runs in a dedicated worker (`ffmpeg-decode.worker.ts`) that
 * loads the self-hosted ESM core from `/public/ffmpeg/`. This module just drives
 * it: send the file bytes, await mono 16 kHz Float32 PCM. No audio leaves the
 * device. See `docs/TDR_Local_Voice_Notes.md`.
 */

import { WHISPER_SAMPLE_RATE } from "@/lib/voice/audio-pcm";

const CORE_URL = "/ffmpeg/ffmpeg-core.js";
const WASM_URL = "/ffmpeg/ffmpeg-core.wasm";

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./ffmpeg-decode.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}

function safeExtension(name: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1].toLowerCase() : "bin";
}

/**
 * Decode any ffmpeg-supported audio file to mono 16 kHz Float32 PCM. `onProgress`
 * reports 0..1 during conversion. Throws if ffmpeg can't load or decode.
 */
export async function decodeAudioFileViaFfmpeg(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<Float32Array> {
  const ffmpeg = getWorker();
  const bytes = new Uint8Array(await file.arrayBuffer());

  return new Promise<Float32Array>((resolve, reject) => {
    const cleanup = () => {
      ffmpeg.removeEventListener("message", onMessage);
      ffmpeg.removeEventListener("error", onError);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "progress") {
        if (onProgress && Number.isFinite(data.value)) {
          onProgress(Math.min(1, Math.max(0, data.value)));
        }
        return;
      }
      if (data.type === "result") {
        cleanup();
        onProgress?.(1);
        resolve(new Float32Array(data.buffer as ArrayBuffer));
        return;
      }
      if (data.type === "error") {
        cleanup();
        reject(new Error(data.message || "ffmpeg decode failed"));
      }
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      // A worker error here usually means the core couldn't load.
      reject(new Error(event.message || "ffmpeg worker failed to load"));
    };

    ffmpeg.addEventListener("message", onMessage);
    ffmpeg.addEventListener("error", onError);
    ffmpeg.postMessage(
      {
        type: "decode",
        coreURL: CORE_URL,
        wasmURL: WASM_URL,
        bytes,
        ext: safeExtension(file.name),
        sampleRate: WHISPER_SAMPLE_RATE,
      },
      [bytes.buffer]
    );
  });
}
