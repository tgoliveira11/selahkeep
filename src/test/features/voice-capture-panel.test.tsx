/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { VoiceCapturePanel } from "@/features/voice/voice-capture-panel";

interface FakeProcessor {
  onaudioprocess: ((e: { inputBuffer: { getChannelData: () => Float32Array } }) => void) | null;
  connect: () => void;
  disconnect: () => void;
}

let lastProcessor: FakeProcessor | null = null;

class FakeAudioContext {
  sampleRate = 16_000;
  state: "running" | "closed" = "running";
  destination = {};
  createMediaStreamSource() {
    return { connect: () => {}, disconnect: () => {} };
  }
  createScriptProcessor(): FakeProcessor {
    const node: FakeProcessor = { onaudioprocess: null, connect: () => {}, disconnect: () => {} };
    lastProcessor = node;
    return node;
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
    lastProcessor?.onaudioprocess?.({
      inputBuffer: { getChannelData: () => new Float32Array(16_000 * seconds) },
    });
  });
}

describe("VoiceCapturePanel (streaming)", () => {
  beforeEach(() => {
    lastProcessor = null;
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
