import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useUnsavedChangesWarning, useConfirmLeave } from "@/features/notes/use-unsaved-changes";

function WarningProbe({ dirty }: { dirty: boolean }) {
  useUnsavedChangesWarning(dirty);
  return null;
}

function LeaveProbe({ dirty }: { dirty: boolean }) {
  const { requestLeave, confirmDialog } = useConfirmLeave(dirty);
  return (
    <div>
      <button type="button" onClick={() => requestLeave(() => screen.getByTestId("left").click())}>
        Leave
      </button>
      <span data-testid="left" />
      {confirmDialog}
    </div>
  );
}

describe("useUnsavedChangesWarning", () => {
  it("registers beforeunload when dirty", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const { rerender } = render(<WarningProbe dirty={false} />);
    expect(addSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));

    rerender(<WarningProbe dirty />);
    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    addSpy.mockRestore();
  });
});

describe("useConfirmLeave", () => {
  it("shows confirmation when leaving with dirty state", () => {
    render(<LeaveProbe dirty />);
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(screen.getByText("Leave without saving?")).toBeTruthy();
  });
});
