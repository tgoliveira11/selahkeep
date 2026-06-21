/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VoiceCapturePanel } from "@/features/voice/voice-capture-panel";
import { resetTranscriptionWorkerForTests } from "@/features/voice/transcription-worker-client";

interface FakePort {
  onmessage: ((e: { data: Float32Array }) => void) | null;
  postMessage: () => void;
  close: () => void;
}

let lastNode: { port: FakePort } | null = null;

class FakeAudioWorkletNode {
  port: FakePort = { onmessage: null, postMessage: () => {}, close: () => {} };
  constructor() {
    lastNode = this;
  }
  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  sampleRate = 16_000;
  state: "running" | "closed" = "running";
  destination = {};
  audioWorklet = { addModule: vi.fn(async () => {}) };
  createMediaStreamSource() {
    return { connect: () => {}, disconnect: () => {} };
  }
  createGain() {
    return { gain: { value: 1 }, connect: () => {}, disconnect: () => {} };
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

let lastWorker: FakeWorker | null = null;
class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  posted: unknown[] = [];
  constructor() {
    lastWorker = this;
  }
  postMessage(msg: unknown) {
    this.posted.push(msg);
    queueMicrotask(() => this.onmessage?.({ data: { type: "result", text: "hello world" } }));
  }
  terminate() {}
}

function installSupportedEnv() {
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("AudioWorkletNode", FakeAudioWorkletNode);
  vi.stubGlobal("Worker", FakeWorker);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })),
    },
  });
}

function pushAudio(seconds = 1) {
  act(() => {
    lastNode?.port.onmessage?.({ data: new Float32Array(16_000 * seconds) });
  });
}

describe("VoiceCapturePanel (streaming)", () => {
  beforeEach(() => {
    resetTranscriptionWorkerForTests();
    lastNode = null;
    lastWorker = null;
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("records, transcribes live, then finalizes and inserts", async () => {
    installSupportedEnv();
    const onInsert = vi.fn();
    const onClose = vi.fn();
    render(<VoiceCapturePanel onInsert={onInsert} onClose={onClose} />);

    expect(screen.getByTestId("voice-privacy-note")).toHaveTextContent(/never uploaded/i);

    await act(async () => {
      fireEvent.click(screen.getByTestId("voice-record"));
    });
    expect(await screen.findByTestId("voice-stop")).toBeInTheDocument();
    expect(screen.getByTestId("voice-live-preview")).toBeInTheDocument();

    pushAudio(1);

    await act(async () => {
      fireEvent.click(screen.getByTestId("voice-stop"));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Final pass produced an editable review with the transcript.
    const textarea = (await screen.findByLabelText(
      "Review before inserting"
    )) as HTMLTextAreaElement;
    expect(textarea.value).toBe("Hello world");
    // Worker received 16 kHz mono audio.
    expect((lastWorker?.posted[0] as { audio: Float32Array }).audio.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("voice-insert"));
    expect(onInsert).toHaveBeenCalledWith("Hello world");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a partial transcript while still recording", async () => {
    vi.useFakeTimers();
    installSupportedEnv();
    render(<VoiceCapturePanel onInsert={vi.fn()} onClose={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("voice-record"));
      await Promise.resolve();
    });
    pushAudio(1);

    await act(async () => {
      vi.advanceTimersByTime(2500); // partial interval fires
      await Promise.resolve();
      await Promise.resolve();
    });

    // Still recording (Stop visible) but the live preview already has text.
    expect(screen.getByTestId("voice-stop")).toBeInTheDocument();
    expect(screen.getByTestId("voice-live-preview")).toHaveTextContent("Hello world");
  });

  it("shows an unsupported message when the browser lacks support", () => {
    render(<VoiceCapturePanel onInsert={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument();
  });

  it("surfaces a microphone permission error", async () => {
    installSupportedEnv();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    render(<VoiceCapturePanel onInsert={vi.fn()} onClose={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("voice-record"));
    });
    expect(await screen.findByText(/Microphone access was denied/i)).toBeInTheDocument();
  });
});
