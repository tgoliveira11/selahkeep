/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { useEffect } from "react";
import { NoteSearchProvider, useNoteSearchContext } from "@/features/notes/note-search-context";
import { subscribeVaultSession } from "@/lib/crypto-client/vault-session";

vi.mock("@/lib/crypto-client/vault-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crypto-client/vault-session")>();
  return {
    ...actual,
    subscribeVaultSession: vi.fn(() => () => {}),
    subscribeVaultActivityTimer: vi.fn(() => () => {}),
    getVaultAutoLockRemainingMs: vi.fn(() => 14 * 60 * 1000 + 32 * 1000),
    lockVaultSession: vi.fn(),
    lockVaultSessionManually: vi.fn(),
    registerVaultBeforeAutoLock: vi.fn(() => () => {}),
    isVaultManuallyLocked: vi.fn(() => false),
    wasVaultLockedByInactivity: vi.fn(() => false),
    registerVaultUnloadGuard: vi.fn(() => () => {}),
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
  });

  it("clears query when vault session notifies lock", async () => {
    let listener: (() => void) | null = null;
    vi.mocked(subscribeVaultSession).mockImplementation((fn) => {
      listener = fn;
      return () => {};
    });

    render(
      <NoteSearchProvider>
        <Probe />
      </NoteSearchProvider>
    );

    await waitFor(() => expect(screen.getByTestId("search-query").textContent).toBe("peace"));
    act(() => listener?.());
    await waitFor(() => expect(screen.getByTestId("search-query").textContent).toBe(""));
  });
});
