# Cloud Agents API Reference

This document summarizes the Cursor Cloud Agents API that powers the CLI in this repository. Use it when you need to script against the API directly, build custom tooling, or understand what the CLI is doing under the hood.

## Base URL & Authentication

- **Base URL:** `https://api.cursor.com`
- **Auth:** HTTP Basic where the username is your API key and the password is empty. In practice the header looks like `Authorization: Basic <base64(CURSOR_API_KEY + ":")>`.

```bash
curl https://api.cursor.com/v0/agents \
  -H "Authorization: Basic $(printf '%s:' "$CURSOR_API_KEY" | base64)"
```

> Tip: The CLI automatically reads `CURSOR_API_KEY` and builds this header for you. If you roll your own script, reuse the same environment variable so you do not store the key in plaintext files.

## Common Headers & Formats

- Requests and responses use JSON. Set `Content-Type: application/json` on any request body.
- All timestamps are ISO 8601 strings (e.g., `2024-05-12T04:17:59.201Z`).
- Large collections use cursor-based pagination. Pass `?cursor=<token>` returned from the previous call.

## Rate Limits & Errors

- Most endpoints follow standard per-user limits. `GET /v0/repositories` is stricter (1/min, 30/hour).
- When you exceed a limit the API returns `429 Too Many Requests` along with an optional `Retry-After` header.
- Authentication failures return `401` with a human-readable message.
- Validation issues return `400` so double-check payloads before retrying.

See `docs/TROUBLESHOOTING.md` for remediation steps.

## Endpoint Cheat Sheet

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v0/agents` | List agents belonging to the current API key |
| `GET` | `/v0/agents/{id}` | Fetch the latest status for a specific agent |
| `POST` | `/v0/agents` | Launch a new agent |
| `GET` | `/v0/agents/{id}/conversation` | Retrieve the message history |
| `POST` | `/v0/agents/{id}/followup` | Send additional instructions |
| `DELETE` | `/v0/agents/{id}` | Delete an agent and associated resources |
| `GET` | `/v0/me` | Inspect metadata about the current API key |
| `GET` | `/v0/models` | List supported model identifiers |
| `GET` | `/v0/repositories` | Enumerate repositories accessible to the key |

## Endpoint Details

### List Agents – `GET /v0/agents`

Parameters:
- `limit` (optional, default 100) – Maximum number of agents to return.
- `cursor` (optional) – Opaque pagination token from a previous response.

```bash
curl "https://api.cursor.com/v0/agents?limit=20" \
  -H "Authorization: Basic $(printf '%s:' "$CURSOR_API_KEY" | base64)"
```

Response (trimmed):

```json
{
  "agents": [
    {
      "id": "bc_abc123",
      "name": "refactor(AgentList)",
      "status": "RUNNING",
      "source": { "repository": "https://github.com/org/repo", "ref": "main" },
      "target": { "url": "https://cursor.com/agents?id=bc_abc123" },
      "createdAt": "2024-05-12T04:17:59.201Z"
    }
  ],
  "nextCursor": "eyJvZmZzZXQiOjIw..."
}
```

### Get Agent Status – `GET /v0/agents/{id}`

Returns the full `Agent` object, including `summary` once the agent finishes.

```bash
curl https://api.cursor.com/v0/agents/bc_abc123 \
  -H "Authorization: Basic $(printf '%s:' "$CURSOR_API_KEY" | base64)"
```

### Launch Agent – `POST /v0/agents`

Request body (all optional fields omitted by default):

```json
{
  "prompt": {
    "text": "refactor(AgentList): extract status order constant",
    "images": [
      { "data": "<base64>", "dimension": { "width": 1280, "height": 720 } }
    ]
  },
  "source": {
    "repository": "https://github.com/org/repo",
    "ref": "main"
  },
  "target": {
    "branchName": "feat/agentlist-order",
    "autoCreatePr": true,
    "openAsCursorGithubApp": false,
    "skipReviewerRequest": true
  },
  "model": "gpt-5.1-codex",
  "webhook": {
    "url": "https://example.com/hook",
    "secret": "32+character+secret"
  }
}
```

Sample command:

```bash
curl https://api.cursor.com/v0/agents \
  -H "Authorization: Basic $(printf '%s:' "$CURSOR_API_KEY" | base64)" \
  -H "Content-Type: application/json" \
  -d @plan.json
```

### Get Conversation – `GET /v0/agents/{id}/conversation`

Returns:

```json
{
  "id": "bc_abc123",
  "messages": [
    { "id": "msg_1", "type": "user_message", "text": "Please add tests." },
    { "id": "msg_2", "type": "assistant_message", "text": "✅ Added tests in src/foo.ts." }
  ]
}
```

### Add Follow-up – `POST /v0/agents/{id}/followup`

Body:

```json
{
  "prompt": {
    "text": "Also update README with new instructions."
  }
}
```

The response echoes the agent ID (`{ "id": "bc_abc123" }`). You can send up to five images per follow-up prompt, mirroring the launch format.

### Delete Agent – `DELETE /v0/agents/{id}`

```bash
curl -X DELETE https://api.cursor.com/v0/agents/bc_abc123 \
  -H "Authorization: Basic $(printf '%s:' "$CURSOR_API_KEY" | base64)"
```

The API responds with `{ "id": "bc_abc123" }` once deletion succeeds. Use this to clean up stale agents or enforce retention policies.

### API Key Info – `GET /v0/me`

Returns metadata such as `apiKeyName`, `userEmail`, and `createdAt`. Helpful for audits and CI validation.

### List Models – `GET /v0/models`

Use this to discover supported model identifiers. The CLI automatically picks a model but you can override it in plans or `launch` invocations.

### List Repositories – `GET /v0/repositories`

This endpoint is rate limited and should only be called when you need to build a UI with repository pickers. Cache responses whenever possible.

## Building on Top of the API

- Reuse the CLI’s helpers in `src/api/client.ts` if you are writing TypeScript scripts; they already encode the authentication, pagination, and error handling logic.
- Prefer webhooks for long-running agents. Supply `webhook.url` and `webhook.secret` in the launch body to avoid polling.
- Combine this document with `docs/EXAMPLES.md` to see practical workflows that mix CLI commands with direct API calls.
