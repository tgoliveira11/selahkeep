"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  concatFloat32,
  resampleLinear,
  WHISPER_SAMPLE_RATE,
} from "@/lib/voice/audio-pcm";
import { formatTranscript } from "@/lib/voice/transcript-format";
import { getVoiceModelId, getVoiceModelHost } from "@/lib/voice/voice-config";
import type { VoiceLanguageCode } from "@/lib/voice/voice-languages";
import type {
  TranscribeRequest,
  TranscribeResponse,
} from "./transcription.worker";

export type VoiceStatus = "idle" | "recording" | "processing" | "ready" | "error";

/** How often, while recording, the accumulated audio is re-transcribed. */
const PARTIAL_INTERVAL_MS = 2500;
/** Minimum recorded duration before the first partial pass runs. */
const MIN_PARTIAL_SECONDS = 0.6;
/** Same-origin AudioWorklet module that captures raw PCM off the main thread. */
const CAPTURE_WORKLET_URL = "/worklets/audio-capture-worklet.js";
const CAPTURE_WORKLET_NAME = "audio-capture";

interface UseVoiceTranscriptionResult {
  supported: boolean;
  status: VoiceStatus;
  /** Live (partial) transcript while recording; final after stop. */
  transcript: string;
  error: string | null;
  /** 0..1 model-download progress (first use only). */
  progress: number;
  startRecording: (language: VoiceLanguageCode) => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof AudioWorkletNode !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    getAudioContextCtor() !== null
  );
}

export function useVoiceTranscription(): UseVoiceTranscriptionResult {
  const [supported] = useState(isSupported);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureNodeRef = useRef<AudioWorkletNode | null>(null);
  const silentRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcmRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(WHISPER_SAMPLE_RATE);
  const languageRef = useRef<VoiceLanguageCode>("en");
  const processingRef = useRef(false);
  const inFlightFinalRef = useRef(false);
  const pendingFinalRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcribeRef = useRef<(final: boolean) => void>(() => {});

  const ensureWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      const worker = new Worker(new URL("./transcription.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<TranscribeResponse>) => {
        const message = event.data;
        if (message.type === "progress") {
          setProgress(message.value);
          return;
        }
        processingRef.current = false;
        if (message.type === "error") {
          setError(message.message);
          setStatus("error");
          return;
        }
        // result
        setTranscript(formatTranscript(message.text));
        if (inFlightFinalRef.current) {
          setStatus("ready");
        } else if (pendingFinalRef.current) {
          pendingFinalRef.current = false;
          transcribeRef.current(true);
        }
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  const transcribe = useCallback(
    (final: boolean) => {
      if (processingRef.current) {
        // A pass is already running; remember to finalize once it returns.
        if (final) pendingFinalRef.current = true;
        return;
      }
      const chunks = pcmRef.current;
      let totalSamples = 0;
      for (const chunk of chunks) totalSamples += chunk.length;
      if (totalSamples === 0) {
        if (final) setStatus("ready");
        return;
      }
      const seconds = totalSamples / sampleRateRef.current;
      if (!final && seconds < MIN_PARTIAL_SECONDS) return;

      const merged = concatFloat32(chunks);
      const pcm = resampleLinear(merged, sampleRateRef.current, WHISPER_SAMPLE_RATE);
      const worker = ensureWorker();
      processingRef.current = true;
      inFlightFinalRef.current = final;
      const request: TranscribeRequest = {
        type: "transcribe",
        audio: pcm,
        language: languageRef.current,
        modelId: getVoiceModelId(),
        modelHost: getVoiceModelHost(),
      };
      worker.postMessage(request, [pcm.buffer]);
    },
    [ensureWorker]
  );

  useEffect(() => {
    transcribeRef.current = transcribe;
  }, [transcribe]);

  const teardownCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (captureNodeRef.current) {
      captureNodeRef.current.port.onmessage = null;
      try {
        captureNodeRef.current.port.close();
      } catch {
        /* already closed */
      }
      try {
        captureNodeRef.current.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      /* already disconnected */
    }
    try {
      silentRef.current?.disconnect();
    } catch {
      /* already disconnected */
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const ctx = ctxRef.current;
    captureNodeRef.current = null;
    sourceRef.current = null;
    silentRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }, []);

  const startRecording = useCallback(
    async (language: VoiceLanguageCode) => {
      if (!supported) {
        setError("Voice capture is not supported in this browser.");
        setStatus("error");
        return;
      }
      setError(null);
      setTranscript("");
      setProgress(0);
      pcmRef.current = [];
      processingRef.current = false;
      inFlightFinalRef.current = false;
      pendingFinalRef.current = false;
      languageRef.current = language;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const Ctor = getAudioContextCtor();
        if (!Ctor) throw new Error("AudioContext unavailable");
        const ctx = new Ctor();
        ctxRef.current = ctx;
        sampleRateRef.current = ctx.sampleRate || WHISPER_SAMPLE_RATE;

        // Capture raw PCM off the main thread via an AudioWorklet.
        await ctx.audioWorklet.addModule(CAPTURE_WORKLET_URL);

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const captureNode = new AudioWorkletNode(ctx, CAPTURE_WORKLET_NAME, {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
        });
        captureNodeRef.current = captureNode;
        captureNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
          pcmRef.current.push(new Float32Array(event.data));
        };
        // Route through a muted gain node so the graph keeps pulling audio
        // without any audible echo.
        const silent = ctx.createGain();
        silent.gain.value = 0;
        silentRef.current = silent;
        source.connect(captureNode);
        captureNode.connect(silent);
        silent.connect(ctx.destination);

        ensureWorker();
        intervalRef.current = setInterval(
          () => transcribeRef.current(false),
          PARTIAL_INTERVAL_MS
        );
        setStatus("recording");
      } catch {
        teardownCapture();
        setError("Microphone access was denied or unavailable.");
        setStatus("error");
      }
    },
    [supported, ensureWorker, teardownCapture]
  );

  const stopRecording = useCallback(() => {
    teardownCapture(); // stops capture; pcmRef keeps the full audio for the final pass
    setStatus("processing");
    transcribeRef.current(true);
  }, [teardownCapture]);

  const reset = useCallback(() => {
    teardownCapture();
    pcmRef.current = [];
    processingRef.current = false;
    inFlightFinalRef.current = false;
    pendingFinalRef.current = false;
    setTranscript("");
    setError(null);
    setProgress(0);
    setStatus("idle");
  }, [teardownCapture]);

  useEffect(() => {
    return () => {
      teardownCapture();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [teardownCapture]);

  return {
    supported,
    status,
    transcript,
    error,
    progress,
    startRecording,
    stopRecording,
    reset,
  };
}
