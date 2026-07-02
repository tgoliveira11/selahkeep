# ADR-007 — Integration Grants and MCP Access

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-02 |
| **Related** | ADR-005, `docs/TDR_AI_Integrations.md` |

## 1. Decision

User-scoped **integration tokens** (`sk_int_…`) authenticate MCP API calls. **Integration Encryption Keys (IEK)** are derived client-side from the UVK and never stored on the server. **Grants** store note/board keys re-wrapped under the IEK.

## 2. Cryptography

```text
IEK = HKDF-SHA256(UVK_bytes, salt="selahkeep:integration:v1", info=integrationId_utf8)
grant = AES-GCM(export(noteKey), IEK, AAD={ userId, resourceId, integrationId, field: integration_grant })
```

- IEK is shown once at creation (base64url raw bytes) for MCP configuration
- Grant `resourceId` is the note or board UUID
- `integrationId` is required in grant AAD

## 3. Token storage

| Store | Content |
|-------|---------|
| `integration_tokens.token_hash` | SHA-256 of full token |
| `integration_tokens.token_prefix` | First 12 chars for UI (`sk_int_abc…`) |
| Plaintext token | MCP env / keychain only |

## 4. Permissions

| Permission | Allows |
|------------|--------|
| `read` | GET MCP resource routes |
| `write` | PUT MCP resource routes |

## 5. Must never be stored server-side

IEK, UVK, note keys, board keys, integration token plaintext, note/board plaintext, recovery material.

## 6. Separation from admin API keys

`api_keys` (secure-auth admin M2M) are platform-admin only. Integration tokens are per-user product scope.

## 7. Audit events

- `integration_created`, `integration_revoked`
- `integration_mcp_read`, `integration_mcp_write` — resource id + integration id only, no content

## 8. Rate limiting

Operation `integrations.mcp` — per integration token + IP.
