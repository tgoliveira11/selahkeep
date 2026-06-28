/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  warmUpTranscription,
  ensureModelLoaded,
  getTranscriptionWorker,
  subscribeTranscription,
  resetTranscriptionWorkerForTests,
} from "@/features/voice/transcription-worker-client";

let lastWorker: FakeWorker | null = null;
class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  posted: unknown[] = [];
  constructor() {
    lastWorker = this;
  }
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  terminate() {}
}

function installDesktopMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      media: "",
      addEventListener() {},
      removeEventListener() {},
    }),
  });
}

function installCapableEnv() {
  installDesktopMatchMedia();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("AudioWorkletNode", class {});
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn() },
  });
}

describe("transcription worker client", () => {
  beforeEach(() => {
    resetTranscriptionWorkerForTests();
    lastWorker = null;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetTranscriptionWorkerForTests();
  });

  it("warms up once (idempotent) when capable and enabled", () => {
    installCapableEnv();
    warmUpTranscription();
    warmUpTranscription();
    expect(lastWorker?.posted).toEqual([
      expect.objectContaining({ type: "warmup" }),
    ]);
  });

  it("does not warm up when voice is disabled", () => {
    installCapableEnv();
    vi.stubEnv("NEXT_PUBLIC_VOICE_NOTES_ENABLED", "false");
    warmUpTranscription();
    expect(lastWorker).toBeNull();
  });

  it("does not warm up without AudioWorklet support", () => {
    vi.stubGlobal("Worker", FakeWorker);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    // AudioWorkletNode intentionally not stubbed.
    warmUpTranscription();
    expect(lastWorker).toBeNull();
  });

  it("does not warm up on data-saver connections", () => {
    installCapableEnv();
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
    warmUpTranscription();
    expect(lastWorker).toBeNull();
    Object.defineProperty(navigator, "connection", { configurable: true, value: undefined });
  });

  it("does not warm up on memory-constrained (mobile) devices", () => {
    installCapableEnv();
    const original = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: /pointer: coarse|max-width/.test(query),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    warmUpTranscription();
    expect(lastWorker).toBeNull();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: original });
  });

  it("ensureModelLoaded skips warm inference on memory-constrained devices", () => {
    installCapableEnv();
    const original = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: /pointer: coarse|max-width/.test(query),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    ensureModelLoaded();
    expect(lastWorker).toBeNull();
    ensureModelLoaded({ force: true });
    expect(lastWorker?.posted).toEqual([
      expect.objectContaining({
        type: "warmup",
        modelId: "Xenova/whisper-tiny",
        skipWarmInference: true,
        forceWasmOnly: true,
      }),
    ]);
    Object.defineProperty(window, "matchMedia", { configurable: true, value: original });
  });

  it("does not load the model on mobile until force is requested", () => {
    installCapableEnv();
    const original = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: /pointer: coarse|max-width/.test(query),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }),
    });
    ensureModelLoaded();
    expect(lastWorker).toBeNull();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: original });
  });

  it("fans worker messages out to subscribers", () => {
    installCapableEnv();
    getTranscriptionWorker();
    const received: unknown[] = [];
    const unsub = subscribeTranscription((m) => received.push(m));
    lastWorker?.onmessage?.({ data: { type: "ready" } });
    expect(received).toEqual([{ type: "ready" }]);
    unsub();
    lastWorker?.onmessage?.({ data: { type: "ready" } });
    expect(received).toHaveLength(1);
  });
});
