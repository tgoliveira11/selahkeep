import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DictateButton } from "@/features/voice/dictate-button";
import {
  getTranscriptionWorker,
  resetTranscriptionWorkerForTests,
} from "@/features/voice/transcription-worker-client";

let lastWorker: FakeWorker | null = null;
class FakeWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  constructor() {
    lastWorker = this;
  }
  postMessage() {}
  terminate() {}
}

describe("DictateButton", () => {
  beforeEach(() => {
    resetTranscriptionWorkerForTests();
    lastWorker = null;
    vi.stubGlobal("Worker", FakeWorker);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetTranscriptionWorkerForTests();
  });

  it("starts not-ready and turns ready (green) once the model is loaded", () => {
    render(<DictateButton onClick={vi.fn()} testId="dictate" />);
    const button = screen.getByTestId("dictate");
    expect(button).toHaveAttribute("data-model-ready", "false");

    getTranscriptionWorker();
    act(() => lastWorker?.onmessage?.({ data: { type: "ready" } }));

    const ready = screen.getByTestId("dictate");
    expect(ready).toHaveAttribute("data-model-ready", "true");
    expect(ready.className).toContain("voice-dictate-btn--ready");
    expect(ready.getAttribute("title")).toMatch(/ready/i);
  });

  it("shows the loading percentage in the tooltip while warming up", () => {
    render(<DictateButton onClick={vi.fn()} testId="dictate" />);
    getTranscriptionWorker();
    act(() =>
      lastWorker?.onmessage?.({ data: { type: "progress", stage: "model", value: 0.42 } })
    );
    expect(screen.getByTestId("dictate").getAttribute("title")).toContain("42%");
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    render(<DictateButton onClick={onClick} testId="dictate" />);
    fireEvent.click(screen.getByTestId("dictate"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
