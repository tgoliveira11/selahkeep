/// <reference lib="webworker" />
/**
 * On-device speech-to-text worker.
 *
 * Loads a Whisper ASR pipeline via transformers.js and runs inference locally.
 * Only model weights are fetched from the network (once, then cached); the
 * audio and the resulting transcript never leave the device. See
 * `docs/TDR_Local_Voice_Notes.md`.
 */

export type TranscribeRequest = {
  type: "transcribe";
  audio: Float32Array;
  language: string;
  modelId: string;
  modelHost?: string;
};

export type TranscribeResponse =
  | { type: "progress"; stage: "model" | "inference"; value: number }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

// Lazily-created singleton pipeline, reused across requests.
let transcriberPromise: Promise<unknown> | null = null;

async function getTranscriber(modelId: string, modelHost: string | undefined) {
  if (transcriberPromise) return transcriberPromise;

  transcriberPromise = (async () => {
    // Dynamic import keeps the heavy library out of the main bundle / SSR.
    const transformers = await import("@huggingface/transformers");
    const { pipeline, env } = transformers;

    // Fetch model weights remotely (no local bundling); never user content.
    env.allowLocalModels = false;
    if (modelHost) {
      env.remoteHost = modelHost;
    }

    return pipeline("automatic-speech-recognition", modelId, {
      progress_callback: (progress: { status?: string; progress?: number }) => {
        if (progress?.status === "progress" && typeof progress.progress === "number") {
          post({ type: "progress", stage: "model", value: progress.progress / 100 });
        }
      },
    });
  })();

  return transcriberPromise;
}

function post(message: TranscribeResponse) {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
}

self.onmessage = async (event: MessageEvent<TranscribeRequest>) => {
  const data = event.data;
  if (!data || data.type !== "transcribe") return;

  try {
    const transcriber = (await getTranscriber(data.modelId, data.modelHost)) as (
      audio: Float32Array,
      options: Record<string, unknown>
    ) => Promise<{ text: string }>;

    post({ type: "progress", stage: "inference", value: 0 });
    const output = await transcriber(data.audio, {
      language: data.language,
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    post({ type: "result", text: output?.text ?? "" });
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Transcription failed",
    });
  }
};
