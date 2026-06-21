/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { VoiceCapturePanel } from "@/features/voice/voice-capture-panel";

class FakeMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: { size: number } }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
    this.ondataavailable?.({ data: { size: 12 } });
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

class FakeAudioContext {
  async decodeAudioData() {
    return {
      numberOfChannels: 1,
      sampleRate: 16_000,
      getChannelData: () => new Float32Array([0.1, 0.2, 0.3]),
    };
  }
  close() {
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
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("Worker", FakeWorker);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })),
    },
  });
}

describe("VoiceCapturePanel", () => {
  beforeEach(() => {
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
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the privacy note and records → transcribes → inserts", async () => {
    installSupportedEnv();
    const onInsert = vi.fn();
    const onClose = vi.fn();
    render(<VoiceCapturePanel onInsert={onInsert} onClose={onClose} />);

    expect(screen.getByTestId("voice-privacy-note")).toHaveTextContent(/never uploaded/i);

    // Choose Portuguese; persisted to localStorage.
    fireEvent.change(screen.getByTestId("voice-language-select"), { target: { value: "pt" } });
    expect(window.localStorage.getItem("selahkeep:voice:lang")).toBe("pt");

    await act(async () => {
      fireEvent.click(screen.getByTestId("voice-record"));
    });
    expect(await screen.findByTestId("voice-stop")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("voice-stop"));
    });

    // Worker received the audio with the chosen language.
    await waitFor(() => expect(lastWorker?.posted.length).toBe(1));
    expect((lastWorker?.posted[0] as { language: string }).language).toBe("pt");

    const review = await screen.findByTestId("voice-review");
    expect(review).toBeInTheDocument();
    const textarea = screen.getByLabelText("Review before inserting") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Hello world");

    fireEvent.click(screen.getByTestId("voice-insert"));
    expect(onInsert).toHaveBeenCalledWith("Hello world");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an unsupported message when the browser lacks support", () => {
    // No MediaRecorder/Worker stubs installed.
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
