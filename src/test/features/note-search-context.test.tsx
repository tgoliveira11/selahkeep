/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useEffect } from "react";
import { NoteSearchProvider, useNoteSearchContext } from "@/features/notes/note-search-context";

const vaultLockMocks = vi.hoisted(() => ({
  triggerLock: null as (() => void) | null,
}));

vi.mock("@tgoliveira/vault-core/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tgoliveira/vault-core/react")>();
  return {
    ...actual,
    useOnVaultLocked: (handler: () => void) => {
      vaultLockMocks.triggerLock = handler;
      return actual.useOnVaultLocked(handler);
    },
  };
});

function Probe() {
  const { query, setQuery } = useNoteSearchContext();
  useEffect(() => {
    setQuery("peace");
  }, [setQuery]);
  return <div data-testid="search-query">{query}</div>;
}

describe("note search context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultLockMocks.triggerLock = null;
  });

  it("clears query when the vault locks", async () => {
    render(
      <NoteSearchProvider>
        <Probe />
      </NoteSearchProvider>
    );

    await waitFor(() => expect(screen.getByTestId("search-query").textContent).toBe("peace"));
    act(() => vaultLockMocks.triggerLock?.());
    await waitFor(() => expect(screen.getByTestId("search-query").textContent).toBe(""));
  });
});
