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

/** Index row for one note (noteId stored as `id`). */
export type VaultIndexNoteEntry = {
  id: string;
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  /** @deprecated Prefer deletedAt — migrated from v1 indexes */
  archived?: boolean;
};

/** @deprecated Use VaultIndexNoteEntry */
export type VaultIndexEntry = VaultIndexNoteEntry;

export type VaultIndexPlaintextV1 = {
  version: 1;
  entries: Array<VaultIndexNoteEntry & { archived: boolean }>;
};

export type VaultIndexPlaintext = {
  version: 2;
  categories: VaultCategory[];
  tags: VaultTag[];
  entries: VaultIndexNoteEntry[];
};

export type NoteMetadataForIndex = {
  id: string;
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  archived?: boolean;
};
