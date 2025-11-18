# Cloud Agents API Reference

This document summarizes the Cursor Cloud Agents HTTP API that powers the `cloud-agent` CLI. Use it when you need to integrate the service into other tools, debug CLI calls, or prototype custom workflows.

## Authentication

- Set `CURSOR_API_KEY` to a valid key from [https://cursor.com/settings](https://cursor.com/settings).
- Requests use HTTP Basic auth where the username is the API key and the password is blank.
- Every request must include `Authorization: Basic <base64(api_key:)>`.

```bash
export CURSOR_API_KEY=cur_xxx
curl https://api.cursor.com/v0/me \
  -H "Authorization: Basic $(printf '%s:' "$CURSOR_API_KEY" | base64)"
```

## Base URL and Versioning

- Base URL: `https://api.cursor.com`
- All paths are prefixed with `/v0`
- Responses are JSON encoded in UTF-8

## Core Endpoints

### Launch an Agent — `POST /v0/agents`

Start a new agent that works on a repository.

**Body fields:**

- `prompt` – `{ text: string, plan?: { steps: string[] } }`
- `source` – `{ repository: string, ref?: string }`
- `target` (optional) – `{ branch?: string, autoPr?: boolean }`

```bash
curl https://api.cursor.com/v0/agents \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": { "text": "# Improve docs\n\n- add API reference" },
    "source": {
      "repository": "https://github.com/jxnl/cloud-cursor-agent",
      "ref": "main"
    },
    "target": { "branch": "docs-refresh", "autoPr": true }
  }'
```

**CLI equivalent:** `cloud-agent launch --plan plan.md --branch docs-refresh`

### List Agents — `GET /v0/agents`

Returns paginated agents for the authenticated user.

- Query parameters: `limit` (default 25), `cursor` (pagination token).
- CLI equivalent: `cloud-agent list --non-interactive`.

### Get Agent Status — `GET /v0/agents/{id}`

Fetches a single agent including status, summary, plan, and PR links.  
CLI equivalent: `cloud-agent status bc_abc123 --non-interactive`.

### Watch Agent Conversation — `GET /v0/agents/{id}/conversation`

Returns the structured conversation history, including user prompts and tool output.  
CLI equivalent: `cloud-agent conversation bc_abc123 --non-interactive`.

### Add Follow-up Instructions — `POST /v0/agents/{id}/followup`

Send additional context once an agent is running.

```bash
curl https://api.cursor.com/v0/agents/bc_abc123/followup \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": {
      "text": "Add test coverage for cancel command"
    }
  }'
```

CLI equivalent: `cloud-agent followup bc_abc123 "Add tests"`.

### Delete Agent — `DELETE /v0/agents/{id}`

Removes an agent and its cached artifacts.  
CLI equivalent: `cloud-agent delete bc_abc123`.

### API Key Metadata — `GET /v0/me`

Returns the name, email, and creation timestamp for the current key.  
CLI equivalent: `cloud-agent me`.

### Available Models — `GET /v0/models`

Lists models that can be used when launching agents, along with descriptions and availability flags.  
CLI equivalent: `cloud-agent list-models`.

### Accessible Repositories — `GET /v0/repositories`

Lists GitHub repositories visible to the authenticated user. The endpoint is rate limited (1/minute, 30/hour).  
CLI equivalent: `cloud-agent list --dir <path>` when using repository auto-detection.

## Rate Limits and Errors

- `429 Too Many Requests`: Back off and retry after the `Retry-After` header (CLI waits automatically).
- `401 Unauthorized`: Confirm `CURSOR_API_KEY` is set and valid.
- `404 Not Found`: Double-check the agent identifier or repository URL.
- `5xx`: Temporary service issue; retry with exponential backoff.

All error payloads follow `{ "error": { "message": string } }`. The CLI surfaces these messages along with actionable tips.

## Using the TypeScript Client

The project exposes `CloudAgentsApiClient` under `src/api/client.ts`. Import it to script actions or write tests.

```ts
import { CloudAgentsApiClient } from "../src/api/client.js";

const client = new CloudAgentsApiClient(process.env.CURSOR_API_KEY!);
const agent = await client.launchAgent({
  prompt: { text: "# Cleanup\n\n- remove debug logs" },
  source: { repository: "https://github.com/org/repo", ref: "main" },
});

console.log(agent.id); // bc_abc123
```

## See Also

- `docs/EXAMPLES.md` for concrete CLI walkthroughs
- `docs/TROUBLESHOOTING.md` for common failure modes
- `README.md` for installation and onboarding
