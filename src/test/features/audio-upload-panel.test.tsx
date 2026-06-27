/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("@/lib/voice/audio-decode", () => ({
  ACCEPTED_AUDIO_TYPES: "audio/*",
  decodeAudioFileToPcm: vi.fn(async () => new Float32Array(16_000)),
}));

import { AudioUploadPanel } from "@/features/voice/audio-upload-panel";
import { resetTranscriptionWorkerForTests } from "@/features/voice/transcription-worker-client";
import { decodeAudioFileToPcm } from "@/lib/voice/audio-decode";

let lastWorker: FakeWorker | null = null;
class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  posted: unknown[] = [];
  constructor() {
    lastWorker = this;
  }
  postMessage(msg: unknown) {
    this.posted.push(msg);
    queueMicrotask(() =>
      this.onmessage?.({
        data: { type: "result", text: "[Person one] Hello there\n\n[Person two] Hi friend" },
      })
    );
  }
  terminate() {}
}

class FakeAudioContext {}

function installEnv() {
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("AudioContext", FakeAudioContext);
}

describe("AudioUploadPanel", () => {
  beforeEach(() => {
    resetTranscriptionWorkerForTests();
    lastWorker = null;
    vi.mocked(decodeAudioFileToPcm).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("transcribes an uploaded file (with speaker labels) and inserts it", async () => {
    installEnv();
    const onInsert = vi.fn();
    const onClose = vi.fn();
    render(<AudioUploadPanel onInsert={onInsert} onClose={onClose} />);

    expect(screen.getByTestId("audio-upload-privacy")).toHaveTextContent(/detected automatically/i);
    expect(screen.getByTestId("audio-upload-diarize")).toBeChecked();

    const file = new File(["audio"], "conversation.mp3", { type: "audio/mpeg" });
    await act(async () => {
      fireEvent.change(screen.getByTestId("audio-upload-input"), { target: { files: [file] } });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Decoded once and asked the worker to transcribe the file with diarization.
    expect(decodeAudioFileToPcm).toHaveBeenCalledWith(file, expect.any(Function));
    const req = lastWorker?.posted.find(
      (m) => (m as { type?: string }).type === "transcribe-file"
    ) as { diarize: boolean; audio: Float32Array } | undefined;
    expect(req?.diarize).toBe(true);
    expect(req?.audio.length).toBeGreaterThan(0);

    const textarea = (await screen.findByLabelText(
      "Review before inserting"
    )) as HTMLTextAreaElement;
    expect(textarea.value).toContain("[Person one]");
    expect(textarea.value).toContain("[Person two]");

    fireEvent.click(screen.getByTestId("audio-upload-insert"));
    expect(onInsert).toHaveBeenCalledWith(
      "[Person one] Hello there\n\n[Person two] Hi friend"
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("passes diarize=false when speaker separation is unchecked", async () => {
    installEnv();
    render(<AudioUploadPanel onInsert={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId("audio-upload-diarize"));
    const file = new File(["audio"], "memo.wav", { type: "audio/wav" });
    await act(async () => {
      fireEvent.change(screen.getByTestId("audio-upload-input"), { target: { files: [file] } });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const req = lastWorker?.posted.find(
      (m) => (m as { type?: string }).type === "transcribe-file"
    ) as { diarize: boolean } | undefined;
    expect(req?.diarize).toBe(false);
  });
});
