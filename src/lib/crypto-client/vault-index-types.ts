import type { NoteSortOption } from "@/lib/notes/note-sort";
import type { ResolvedFilter } from "@/lib/crypto-client/note-search";
import type { SmartLocalFilter } from "@/lib/notes/smart-filters";

export type VaultCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type VaultTag = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type SavedViewCriteria = {
  smartFilter: SmartLocalFilter;
  search?: string;
  categoryId?: string | "all" | "none";
  tagId?: string | "all";
  resolved?: ResolvedFilter;
  sort?: NoteSortOption;
};

export type SavedView = {
  id: string;
  name: string;
  criteria: SavedViewCriteria;
  createdAt: string;
  updatedAt: string;
};

/** Encrypted inside vault index — noteId + timestamp only (no plaintext title/body). */
export type RecentlyViewedNote = {
  noteId: string;
  viewedAt: string;
};

/** Index row for one note (noteId stored as `id`). */
export type VaultIndexNoteEntry = {
  id: string;
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  trashedAt?: string | null;
  hasChecklist?: boolean;
  isDailyNote?: boolean;
  hasResolvedReflection?: boolean;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** @deprecated Migrated to trashed/trashedAt */
  deletedAt?: string;
};

/** @deprecated Use VaultIndexNoteEntry */
export type VaultIndexEntry = VaultIndexNoteEntry;

export type VaultIndexPlaintextV1 = {
  version: 1;
  entries: Array<
    VaultIndexNoteEntry & {
      archived: boolean;
    }
  >;
};

export type VaultIndexPlaintextV2 = {
  version: 2;
  categories: VaultCategory[];
  tags: VaultTag[];
  entries: VaultIndexNoteEntry[];
};

export type VaultIndexPlaintext = {
  version: 3;
  categories: VaultCategory[];
  tags: VaultTag[];
  entries: VaultIndexNoteEntry[];
  savedViews?: SavedView[];
  recentlyViewed?: RecentlyViewedNote[];
};

export type NoteMetadataForIndex = {
  id: string;
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  trashed?: boolean;
  trashedAt?: string | null;
  hasChecklist?: boolean;
  isDailyNote?: boolean;
  hasResolvedReflection?: boolean;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
