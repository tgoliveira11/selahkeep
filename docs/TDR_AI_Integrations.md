# TDR — SelahKeep AI Integrations (MCP)

| Field | Value |
|-------|--------|
| **Status** | Proposed |
| **Related** | ADR-007, `docs/TDR_LTG_Vault_MVP.md`, `docs/TDR_Note_Kanban_Boards.md` |

## 1. Summary

SelahKeep notes and Kanban boards can be shared selectively with local AI tools (Cursor, Claude Desktop, Codex) via an **MCP server** and **integration grants**. The server stores only integration token hashes and encrypted grant blobs; plaintext never reaches the API.

Users explicitly opt in per note or board. Once an AI tool reads decrypted content, the user accepts an expanded trust boundary (the AI provider may process content on their infrastructure).

## 2. Goals

- Read/write shared notes and boards from MCP tools without vault-wide unlock on the server
- Preserve zero-knowledge for non-shared resources
- Revocable, auditable integration tokens
- Handoff: localhost bridge or one-time manual export

## 3. Non-goals (MVP)

- Server-side AI on note plaintext
- Vault-wide automatic sharing
- Webhook push to cloud agents without local MCP
- Sharing by tag/category (individual resources only)

## 4. Actors

| Actor | Role |
|-------|------|
| User (browser) | Creates integration, selects resources, derives IEK, uploads grants |
| MCP server (local) | Bearer auth, decrypt grants with IEK, encrypt writes |
| SelahKeep API | Stores ciphertext, validates grants, rate limits |
| AI tool | Invokes MCP tools; may send decrypted context to provider |

## 5. Threat model

| Threat | Mitigation |
|--------|------------|
| Stolen integration token | Hash-only storage, revoke, expiry, rate limits, audit |
| Stolen IEK | User responsibility (keychain/env); never stored on server |
| Token without grant | 404 for out-of-scope resources |
| Plaintext on wire to API | `rejectPlaintext*` + encrypted payloads only |
| Admin reads notes | No admin note APIs; integrations are user-scoped |
| AI provider retention | User consent copy; opt-in per resource |

## 6. User flows

### 6.1 Create integration

1. User unlocks vault in browser
2. Settings → Integrations → Create ("Cursor MacBook")
3. Server creates `integrations` row + token (shown once)
4. Client derives IEK from UVK + integrationId (shown once)
5. User selects notes/boards and permissions (read / read+write)
6. Client wraps resource keys under IEK → `PUT /api/integrations/:id/grants`

### 6.2 Connect MCP

- **Local handoff**: `POST http://127.0.0.1:7431/connect` with credentials (bridge stores in keychain)
- **Manual**: copy `mcp.json` snippet with `SELAHKEEP_INTEGRATION_TOKEN` and `SELAHKEEP_INTEGRATION_KEY`

### 6.3 MCP read/write

1. MCP lists/gets encrypted resources via `/api/integrations/mcp/*`
2. Unwraps grant → resource key → decrypt content locally
3. Returns plaintext to AI tool
4. On write: encrypt locally → `PUT` ciphertext

### 6.4 Revoke

Delete integration → revoke token + grants. Content in vault unchanged.

## 7. API surface

See `docs/ADR-007_Integration_Grants_MCP.md` and `docs/API_REFERENCE.md`.

Kill switch: `INTEGRATIONS_ENABLED=false` disables MCP routes (404).

## 8. UX copy (consent)

> Tools with this integration key can read and change the items you select. AI providers may process decrypted content on their servers. Only share what you are comfortable exposing.

## 9. Acceptance criteria

- [ ] Create/list/revoke integrations (session auth)
- [ ] Grants upsert with encrypted wrapped keys only
- [ ] MCP Bearer routes return only granted resources
- [ ] MCP write requires write permission on grant
- [ ] Sentinel phrase never in DB/API/logs for integration paths
- [ ] `npm run validate` passes
