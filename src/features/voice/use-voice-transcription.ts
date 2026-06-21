"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mixToMono,
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

interface UseVoiceTranscriptionResult {
  supported: boolean;
  status: VoiceStatus;
  transcript: string;
  error: string | null;
  /** 0..1 model/inference progress while processing. */
  progress: number;
  startRecording: (language: VoiceLanguageCode) => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

async function decodeToWhisperPcm(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      channels.push(audioBuffer.getChannelData(c));
    }
    const mono = mixToMono(channels);
    return resampleLinear(mono, audioBuffer.sampleRate, WHISPER_SAMPLE_RATE);
  } finally {
    void audioCtx.close();
  }
}

export function useVoiceTranscription(): UseVoiceTranscriptionResult {
  const [supported] = useState(isSupported);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const languageRef = useRef<VoiceLanguageCode>("en");

  const ensureWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      const worker = new Worker(new URL("./transcription.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<TranscribeResponse>) => {
        const message = event.data;
        if (message.type === "progress") {
          setProgress(message.value);
        } else if (message.type === "result") {
          setTranscript(formatTranscript(message.text));
          setStatus("ready");
        } else if (message.type === "error") {
          setError(message.message);
          setStatus("error");
        }
      };
      workerRef.current = worker;
    }
    return workerRef.current;
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const handleStop = useCallback(async () => {
    setStatus("processing");
    setProgress(0);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      const pcm = await decodeToWhisperPcm(blob);
      const worker = ensureWorker();
      const request: TranscribeRequest = {
        type: "transcribe",
        audio: pcm,
        language: languageRef.current,
        modelId: getVoiceModelId(),
        modelHost: getVoiceModelHost(),
      };
      worker.postMessage(request, [pcm.buffer]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process audio");
      setStatus("error");
    }
  }, [ensureWorker]);

  const startRecording = useCallback(
    async (language: VoiceLanguageCode) => {
      if (!supported) {
        setError("Voice capture is not supported in this browser.");
        setStatus("error");
        return;
      }
      setError(null);
      setTranscript("");
      languageRef.current = language;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          releaseStream();
          void handleStop();
        };
        recorderRef.current = recorder;
        recorder.start();
        setStatus("recording");
      } catch {
        releaseStream();
        setError("Microphone access was denied or unavailable.");
        setStatus("error");
      }
    },
    [supported, handleStop, releaseStream]
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    } else {
      releaseStream();
    }
  }, [releaseStream]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    setProgress(0);
    setStatus("idle");
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      releaseStream();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [releaseStream]);

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
