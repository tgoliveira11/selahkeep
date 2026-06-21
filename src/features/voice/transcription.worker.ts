/// <reference lib="webworker" />
/**
 * On-device speech-to-text worker.
 *
 * Loads a Whisper ASR pipeline via transformers.js and runs inference locally.
 * Only model weights are fetched from the network (once, then cached); the
 * audio and the resulting transcript never leave the device. See
 * `docs/TDR_Local_Voice_Notes.md`.
 */

export type TranscribeRequest =
  | {
      type: "transcribe";
      audio: Float32Array;
      language: string;
      modelId: string;
      modelHost?: string;
    }
  | { type: "warmup"; modelId: string; modelHost?: string };

export type TranscribeResponse =
  | { type: "progress"; stage: "model" | "inference"; value: number }
  | { type: "result"; text: string }
  | { type: "ready" }
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
      // Self-hosted: serve both the model weights and the ONNX-runtime WASM
      // from the configured first-party host (no third-party CDN contact).
      env.remoteHost = modelHost;
      const wasmBase = modelHost.endsWith("/") ? modelHost : `${modelHost}/`;
      const onnxEnv = (env as { backends?: { onnx?: { wasm?: { wasmPaths?: string } } } })
        .backends?.onnx?.wasm;
      if (onnxEnv) {
        onnxEnv.wasmPaths = wasmBase;
      }
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
  if (!data) return;

  // Background warm-up: download weights + initialize the pipeline ahead of
  // the first dictation so first use is instant. Does not transcribe.
  if (data.type === "warmup") {
    try {
      await getTranscriber(data.modelId, data.modelHost);
      post({ type: "ready" });
    } catch (error) {
      post({
        type: "error",
        message: error instanceof Error ? error.message : "Model warm-up failed",
      });
    }
    return;
  }

  if (data.type !== "transcribe") return;

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
