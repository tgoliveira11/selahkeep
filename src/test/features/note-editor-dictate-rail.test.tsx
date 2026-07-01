import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteEditorDictateRail } from "@/components/notes/note-editor-dictate-rail";

vi.mock("@/features/voice/use-voice-model-status", () => ({
  useVoiceModelStatus: vi.fn(() => ({ ready: true, progress: 1 })),
}));

describe("NoteEditorDictateRail", () => {
  it("renders the Stillness dictate card and opens the panel", () => {
    const onOpen = vi.fn();
    render(<NoteEditorDictateRail onOpen={onOpen} />);
    expect(screen.getByTestId("new-note-dictate-rail")).toBeInTheDocument();
    expect(screen.getByText(/voice model ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("new-note-dictate"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
