"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOnVaultLocked } from "@tgoliveira/vault-core/react";

interface NoteSearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  clearQuery: () => void;
}

const NoteSearchContext = createContext<NoteSearchContextValue | null>(null);

/** Client-only search query for highlighting — never sent to server or URL. */
export function NoteSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState("");

  useOnVaultLocked(() => {
    setQueryState("");
  });

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState("");
  }, []);

  const value = useMemo(
    () => ({ query, setQuery, clearQuery }),
    [query, setQuery, clearQuery]
  );

  return <NoteSearchContext.Provider value={value}>{children}</NoteSearchContext.Provider>;
}

export function useNoteSearchContext(): NoteSearchContextValue {
  const context = useContext(NoteSearchContext);
  if (!context) {
    return {
      query: "",
      setQuery: () => {},
      clearQuery: () => {},
    };
  }
  return context;
}

/** Optional hook when provider may be absent (tests). */
export function useOptionalNoteSearchContext(): NoteSearchContextValue | null {
  return useContext(NoteSearchContext);
}
