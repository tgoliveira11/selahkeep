export type VaultIndexEntry = {
  id: string;
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export type VaultIndexPlaintext = {
  version: 1;
  entries: VaultIndexEntry[];
};

export type NoteMetadataForIndex = {
  id: string;
  title: string;
  categoryId: string | null;
  tagIds: string[];
  answered: boolean;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
};
