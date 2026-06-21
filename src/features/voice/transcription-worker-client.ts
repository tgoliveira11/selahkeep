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
}

let modelProgress = 0;
let modelReady = false;
const statusSubscribers = new Set<(status: VoiceModelStatus) => void>();

function notifyStatus(): void {
  const snapshot: VoiceModelStatus = { progress: modelProgress, ready: modelReady };
  for (const cb of statusSubscribers) cb(snapshot);
}

function trackModelStatus(message: TranscribeResponse): void {
  if (message.type === "progress" && message.stage === "model") {
    modelProgress = message.value;
    notifyStatus();
  } else if (message.type === "ready") {
    modelReady = true;
    modelProgress = 1;
    notifyStatus();
  } else if (message.type === "result" && !modelReady) {
    // A successful transcription implies the model is loaded.
    modelReady = true;
    modelProgress = 1;
    notifyStatus();
  }
}

export function getModelStatus(): VoiceModelStatus {
  return { progress: modelProgress, ready: modelReady };
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

/** Capability + connection gate for background warm-up. */
function isWarmupAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!isVoiceNotesEnabled()) return false;
  if (typeof Worker === "undefined" || typeof AudioWorkletNode === "undefined") return false;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
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
 * Pre-download model weights and initialize the pipeline in the background.
 * Idempotent and safe to call on every app load; no audio is involved.
 */
export function warmUpTranscription(): void {
  if (warmed || !isWarmupAllowed()) return;
  warmed = true;
  postTranscription({
    type: "warmup",
    modelId: getVoiceModelId(),
    modelHost: getVoiceModelHost(),
  });
}

/** @internal test helper */
export function resetTranscriptionWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  warmed = false;
  modelProgress = 0;
  modelReady = false;
  subscribers.clear();
  statusSubscribers.clear();
}
