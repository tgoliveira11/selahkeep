"use client";

import { getVoiceModelId, getVoiceModelHost, isVoiceNotesEnabled } from "@/lib/voice/voice-config";
import type { TranscribeRequest, TranscribeResponse } from "./transcription.worker";

/**
 * App-wide singleton for the on-device Whisper worker.
 *
 * The worker (and the loaded model) is created once and shared, so the model
 * can be warmed up in the background at app load and reused instantly by the
 * dictation panel. A single `onmessage` fans out to all subscribers, so the
 * warm-up and the active panel can listen at the same time.
 */
let worker: Worker | null = null;
let warmed = false;
const subscribers = new Set<(message: TranscribeResponse) => void>();

export interface VoiceModelStatus {
  /** 0..1 model-download/initialization progress. */
  progress: number;
  /** True once the pipeline is loaded and ready for instant transcription. */
  ready: boolean;
  /** Which compute backend the loaded pipeline runs on, once known. */
  backend?: "webgpu" | "wasm";
}

let modelProgress = 0;
let modelReady = false;
let modelBackend: "webgpu" | "wasm" | undefined;
const statusSubscribers = new Set<(status: VoiceModelStatus) => void>();

function notifyStatus(): void {
  const snapshot: VoiceModelStatus = {
    progress: modelProgress,
    ready: modelReady,
    backend: modelBackend,
  };
  for (const cb of statusSubscribers) cb(snapshot);
}

function trackModelStatus(message: TranscribeResponse): void {
  if (message.type === "progress" && message.stage === "model") {
    modelProgress = message.value;
    notifyStatus();
  } else if (message.type === "ready") {
    modelReady = true;
    modelProgress = 1;
    if (message.backend) modelBackend = message.backend;
    notifyStatus();
  } else if (message.type === "result" && !modelReady) {
    // A successful transcription implies the model is loaded.
    modelReady = true;
    modelProgress = 1;
    notifyStatus();
  } else if (message.type === "error") {
    // Allow a later attempt to re-trigger the download/init.
    warmed = false;
  }
}

export function getModelStatus(): VoiceModelStatus {
  return { progress: modelProgress, ready: modelReady, backend: modelBackend };
}

export function subscribeModelStatus(
  handler: (status: VoiceModelStatus) => void
): () => void {
  statusSubscribers.add(handler);
  return () => {
    statusSubscribers.delete(handler);
  };
}

export function getTranscriptionWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./transcription.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<TranscribeResponse>) => {
      trackModelStatus(event.data);
      for (const subscriber of subscribers) subscriber(event.data);
    };
  }
  return worker;
}

export function subscribeTranscription(
  handler: (message: TranscribeResponse) => void
): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

export function postTranscription(message: TranscribeRequest, transfer: Transferable[] = []): void {
  getTranscriptionWorker().postMessage(message, transfer);
}

/** Capability gate: the browser can actually run on-device voice at all. */
function canRunVoice(): boolean {
  if (typeof window === "undefined") return false;
  if (!isVoiceNotesEnabled()) return false;
  if (typeof Worker === "undefined" || typeof AudioWorkletNode === "undefined") return false;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  return true;
}

/** Whether it's polite to download a large model in the background right now. */
function isPoliteConnection(): boolean {
  const connection = (
    navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (connection?.saveData) return false;
  if (typeof connection?.effectiveType === "string" && /2g/.test(connection.effectiveType)) {
    return false;
  }
  return true;
}

/**
 * Phones/tablets have tight per-tab memory budgets — eagerly loading a multi-MB
 * speech model in the background can crash/reload the tab (iOS Safari). On such
 * devices we skip the background warm-up and load the model on demand instead
 * (when the user actually starts dictation / audio upload).
 */
export function isMemoryConstrainedDevice(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(max-width: 1024px)").matches) return true;
    if (
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 0 &&
      window.matchMedia("(max-width: 1280px)").matches
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function postWarmup(skipWarmInference = false): void {
  if (warmed) return;
  warmed = true;
  postTranscription({
    type: "warmup",
    modelId: getVoiceModelId(),
    modelHost: getVoiceModelHost(),
    skipWarmInference,
  });
}

/**
 * Pre-download model weights and initialize the pipeline in the background at
 * app load. Idempotent; skipped on metered/save-data connections to stay polite
 * (the user can still trigger the download explicitly by opening dictation).
 */
export function warmUpTranscription(): void {
  if (!canRunVoice() || !isPoliteConnection() || isMemoryConstrainedDevice()) return;
  postWarmup();
}

/**
 * User-initiated model load (e.g. on opening the dictation panel). Like
 * `warmUpTranscription` but ignores the polite-connection gate, since the user
 * has asked to dictate. Idempotent and safe to call repeatedly.
 *
 * On memory-constrained devices the heavy warm inference is skipped so typing
 * in the note editor stays responsive while the model downloads.
 */
export function ensureModelLoaded(): void {
  if (!canRunVoice()) return;
  postWarmup(isMemoryConstrainedDevice());
}

/** @internal test helper */
export function resetTranscriptionWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  warmed = false;
  modelProgress = 0;
  modelReady = false;
  modelBackend = undefined;
  subscribers.clear();
  statusSubscribers.clear();
}
