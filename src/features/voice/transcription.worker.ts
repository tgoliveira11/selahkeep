/// <reference lib="webworker" />
/**
 * On-device speech-to-text worker.
 *
 * Loads a Whisper ASR pipeline via transformers.js and runs inference locally.
 * Only model weights are fetched from the network (once, then cached); the
 * audio and the resulting transcript never leave the device. See
 * `docs/TDR_Local_Voice_Notes.md`.
 */

import { formatDiarizedText, type DiarSegment, type DiarWord } from "@/lib/voice/diarization";

export type TranscribeRequest =
  | {
      type: "transcribe";
      audio: Float32Array;
      language: string;
      modelId: string;
      modelHost?: string;
    }
  | {
      // Whole-file transcription. `language` forces the transcription language;
      // omit it to let Whisper auto-detect. Optionally labels speakers.
      type: "transcribe-file";
      audio: Float32Array;
      diarize: boolean;
      language?: string;
      modelId: string;
      modelHost?: string;
    }
  | {
      type: "warmup";
      modelId: string;
      modelHost?: string;
      skipWarmInference?: boolean;
      forceWasmOnly?: boolean;
    };

export type VoiceBackend = "webgpu" | "wasm";

export type TranscribeResponse =
  | { type: "progress"; stage: "model" | "inference" | "diarization"; value: number }
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

async function getTranscriber(
  modelId: string,
  modelHost: string | undefined,
  options?: { forceWasmOnly?: boolean }
) {
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
    // WASM on CPU. Skipped on phones/tablets — WebGPU fp32 doubles peak RAM.
    if (!options?.forceWasmOnly && (await detectWebGPU())) {
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

// On-device speaker diarization (pyannote segmentation 3.0, ~6 MB). Lazily
// loaded only when a file upload asks for speaker labels.
const DIARIZATION_MODEL = "onnx-community/pyannote-segmentation-3.0";

type RawSegment = { id: number; start: number; end: number; confidence: number };
type DiarizerProcessor = {
  (audio: Float32Array): Promise<Record<string, unknown>>;
  post_process_speaker_diarization: (logits: unknown, length: number) => RawSegment[][];
};
type Diarizer = {
  processor: DiarizerProcessor;
  model: (inputs: Record<string, unknown>) => Promise<{ logits: unknown }>;
};

let diarizerPromise: Promise<Diarizer> | null = null;

async function getDiarizer(modelHost: string | undefined): Promise<Diarizer> {
  if (diarizerPromise) return diarizerPromise;
  diarizerPromise = (async () => {
    const { AutoProcessor, AutoModelForAudioFrameClassification, env } = await import(
      "@huggingface/transformers"
    );
    env.allowLocalModels = false;
    if (modelHost) env.remoteHost = modelHost;
    const progress_callback = (progress: { status?: string; progress?: number }) => {
      if (progress?.status === "progress" && typeof progress.progress === "number") {
        post({ type: "progress", stage: "model", value: progress.progress / 100 });
      }
    };
    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(DIARIZATION_MODEL, { progress_callback }),
      AutoModelForAudioFrameClassification.from_pretrained(DIARIZATION_MODEL, {
        progress_callback,
      }),
    ]);
    const runModel = model as unknown as (
      inputs: Record<string, unknown>
    ) => Promise<{ logits: unknown }>;
    return {
      processor: processor as unknown as DiarizerProcessor,
      model: (inputs: Record<string, unknown>) => runModel(inputs),
    };
  })();
  diarizerPromise.catch(() => {
    diarizerPromise = null;
  });
  return diarizerPromise;
}

/** Run diarization and return speaker-active segments (seconds). */
async function diarize(
  audio: Float32Array,
  modelHost: string | undefined
): Promise<DiarSegment[]> {
  const { processor, model } = await getDiarizer(modelHost);
  const inputs = await processor(audio);
  const { logits } = await model(inputs);
  const segments = processor.post_process_speaker_diarization(logits, audio.length)[0] ?? [];
  return segments.map((s) => ({ id: s.id, start: s.start, end: s.end }));
}

self.onmessage = async (event: MessageEvent<TranscribeRequest>) => {
  const data = event.data;
  if (!data) return;

  // Background warm-up: download weights + initialize the pipeline ahead of
  // the first dictation so first use is instant. Does not transcribe.
  if (data.type === "warmup") {
    try {
      const transcriber = (await getTranscriber(data.modelId, data.modelHost, {
        forceWasmOnly: data.forceWasmOnly,
      })) as (
        audio: Float32Array,
        options: Record<string, unknown>
      ) => Promise<{ text: string }>;
      // Run one tiny inference on silence so kernels/shaders are compiled now
      // (especially important on WebGPU) — the first real partial is then fast.
      // Skipped on memory-constrained devices where it can freeze the main tab.
      if (!data.skipWarmInference) {
        try {
          await transcriber(new Float32Array(WHISPER_SAMPLE_RATE), {
            language: "en",
            task: "transcribe",
            chunk_length_s: 30,
          });
        } catch {
          /* warm inference is best-effort */
        }
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

  // Whole-file transcription: detect the language automatically and, when
  // requested, label speakers using on-device diarization.
  if (data.type === "transcribe-file") {
    try {
      const transcriber = (await getTranscriber(data.modelId, data.modelHost)) as (
        audio: Float32Array,
        options: Record<string, unknown>
      ) => Promise<{ text: string; chunks?: Array<{ text: string; timestamp: [number, number] }> }>;

      post({ type: "progress", stage: "inference", value: 0 });
      const output = await transcriber(data.audio, {
        // `language` forces the language; omitting it lets Whisper auto-detect.
        ...(data.language ? { language: data.language } : {}),
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: data.diarize ? "word" : false,
      });

      let text = output?.text?.trim() ?? "";

      if (data.diarize && output?.chunks?.length) {
        try {
          post({ type: "progress", stage: "diarization", value: 0 });
          const segments = await diarize(data.audio, data.modelHost);
          const words: DiarWord[] = output.chunks
            .filter((c) => Array.isArray(c.timestamp) && typeof c.timestamp[0] === "number")
            .map((c) => ({
              text: c.text,
              start: c.timestamp[0],
              end: c.timestamp[1] ?? c.timestamp[0],
            }));
          const labelled = formatDiarizedText(words, segments);
          if (labelled) text = labelled;
        } catch {
          // Diarization is best-effort; fall back to the plain transcript.
        }
      }

      post({ type: "result", text });
    } catch (error) {
      post({
        type: "error",
        message: error instanceof Error ? error.message : "Transcription failed",
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
