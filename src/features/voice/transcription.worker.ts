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

export type VoiceBackend = "webgpu" | "wasm";

export type TranscribeResponse =
  | { type: "progress"; stage: "model" | "inference"; value: number }
  | { type: "result"; text: string }
  | { type: "ready"; backend?: VoiceBackend }
  | { type: "error"; message: string };

const WHISPER_SAMPLE_RATE = 16_000;

// Lazily-created singleton pipeline, reused across requests.
let transcriberPromise: Promise<unknown> | null = null;
let activeBackend: VoiceBackend = "wasm";

/** WebGPU is dramatically faster than WASM for Whisper; probe it (in-worker). */
async function detectWebGPU(): Promise<boolean> {
  try {
    const gpu = (self.navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } })
      .gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

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

    const progress_callback = (progress: { status?: string; progress?: number }) => {
      if (progress?.status === "progress" && typeof progress.progress === "number") {
        post({ type: "progress", stage: "model", value: progress.progress / 100 });
      }
    };

    // Prefer the GPU when available (fp32 weights), falling back to quantized
    // WASM on CPU. Each path downloads only its own weight set (once, cached).
    if (await detectWebGPU()) {
      try {
        const gpuPipe = await pipeline("automatic-speech-recognition", modelId, {
          device: "webgpu",
          dtype: { encoder_model: "fp32", decoder_model_merged: "fp32" },
          progress_callback,
        } as Record<string, unknown>);
        activeBackend = "webgpu";
        return gpuPipe;
      } catch {
        // WebGPU init failed (missing fp32 weights / adapter quirk) — restart
        // the download progress for the CPU path below.
        post({ type: "progress", stage: "model", value: 0 });
      }
    }

    const cpuPipe = await pipeline("automatic-speech-recognition", modelId, {
      device: "wasm",
      dtype: "q8",
      progress_callback,
    } as Record<string, unknown>);
    activeBackend = "wasm";
    return cpuPipe;
  })();

  // If loading fails (e.g. a dropped download), clear the cached promise so a
  // later attempt can retry instead of returning the same rejected promise.
  transcriberPromise.catch(() => {
    transcriberPromise = null;
  });

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
      const transcriber = (await getTranscriber(data.modelId, data.modelHost)) as (
        audio: Float32Array,
        options: Record<string, unknown>
      ) => Promise<{ text: string }>;
      // Run one tiny inference on silence so kernels/shaders are compiled now
      // (especially important on WebGPU) — the first real partial is then fast.
      try {
        await transcriber(new Float32Array(WHISPER_SAMPLE_RATE), {
          language: "en",
          task: "transcribe",
          chunk_length_s: 30,
        });
      } catch {
        /* warm inference is best-effort */
      }
      post({ type: "ready", backend: activeBackend });
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
