import type { EncryptedPayload } from "./crypto.js";

export type Config = {
  apiUrl: string;
  token: string;
  integrationKey: string;
};

export type GrantedNote = {
  id: string;
  encryptedMetadata: EncryptedPayload;
  encryptedBody: EncryptedPayload;
  encryptedWrappedNoteKey: EncryptedPayload;
  bodyEncryptionVersion: string;
  grant: {
    permissions: string;
    encryptedWrappedKey: EncryptedPayload;
  };
};

export type GrantedBoard = {
  id: string;
  encryptedBoard: EncryptedPayload;
  encryptedWrappedKey: EncryptedPayload;
  boardEncryptionVersion: string;
  grant: {
    permissions: string;
    encryptedWrappedKey: EncryptedPayload;
  };
};

export class SelahKeepClient {
  constructor(private readonly config: Config) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.token}`,
      "Content-Type": "application/json",
    };
  }

  private url(path: string): string {
    return `${this.config.apiUrl.replace(/\/$/, "")}${path}`;
  }

  async listNotes(): Promise<GrantedNote[]> {
    const res = await fetch(this.url("/api/integrations/mcp/notes"), { headers: this.headers() });
    if (!res.ok) throw new Error(`listNotes failed: ${res.status}`);
    return (await res.json()) as GrantedNote[];
  }

  async getNote(id: string): Promise<GrantedNote> {
    const res = await fetch(this.url(`/api/integrations/mcp/notes/${id}`), {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`getNote failed: ${res.status}`);
    return (await res.json()) as GrantedNote;
  }

  async updateNote(
    id: string,
    payload: {
      encryptedMetadata: EncryptedPayload;
      encryptedBody: EncryptedPayload;
      encryptedWrappedNoteKey: EncryptedPayload;
      bodyEncryptionVersion: string;
    }
  ) {
    const res = await fetch(this.url(`/api/integrations/mcp/notes/${id}`), {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`updateNote failed: ${res.status}`);
    return res.json();
  }

  async listBoards(): Promise<GrantedBoard[]> {
    const res = await fetch(this.url("/api/integrations/mcp/kanban"), { headers: this.headers() });
    if (!res.ok) throw new Error(`listBoards failed: ${res.status}`);
    return (await res.json()) as GrantedBoard[];
  }

  async getBoard(boardId: string): Promise<GrantedBoard> {
    const res = await fetch(this.url(`/api/integrations/mcp/kanban/${boardId}`), {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`getBoard failed: ${res.status}`);
    return (await res.json()) as GrantedBoard;
  }

  async updateBoard(
    boardId: string,
    payload: {
      encryptedBoard: EncryptedPayload;
      encryptedWrappedKey: EncryptedPayload;
      boardEncryptionVersion: string;
    }
  ) {
    const res = await fetch(this.url(`/api/integrations/mcp/kanban/${boardId}`), {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`updateBoard failed: ${res.status}`);
    return res.json();
  }
}
