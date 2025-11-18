# Troubleshooting Guide

Use this guide when the `cloud-agent` CLI or the underlying API behaves unexpectedly. Each section lists symptoms, likely causes, and quick commands to verify the fix.

## Setup and Installation

### CLI Not Found After Install
- **Symptom:** `cloud-agent: command not found`
- **Fix:** Run `npm run install:global` from the repo root, then restart your shell or add `$(npm config get prefix)/bin` to `PATH`.

### Bun or Node Version Errors
- **Symptom:** `bun: command not found` or syntax errors mentioning optional chaining.
- **Fix:** Install Bun (`curl -fsSL https://bun.sh/install | bash`) and ensure Node 18+ is available. Re-run `bun install`.

### Missing API Key
- **Symptom:** CLI exits with `Authentication failed...`
- **Fix:** Export the key before running any command:
  ```bash
  export CURSOR_API_KEY=cur_xxx
  ```
  Confirm with `env | grep CURSOR_API_KEY`.

## Command Failures

### Interactive UI Hangs in Automation
- **Symptom:** Commands appear stuck with a blank screen in CI or agent logs.
- **Fix:** Always add `--non-interactive` (or `--no-interactive`) for `list`, `status`, `conversation`, and other TTY commands:
  ```bash
  cloud-agent list --non-interactive --dir /workspace
  ```

### Plan File Not Found
- **Symptom:** `ENOENT: no such file or directory, open 'plan.md'`
- **Fix:** Pass an absolute path or use the working directory flag:
  ```bash
  cloud-agent launch --plan plan/bug-fixes/type-errors.md --dir /workspace/app
  ```

### Rate Limit (429) Errors
- **Symptom:** `Rate limit exceeded during GET /v0/agents`
- **Fix:** Wait for the `Retry-After` duration. For scripts, add exponential backoff or lower polling frequency (`--interval 5000` with `watch`).

### 401 Unauthorized
- **Symptom:** `Authentication failed while calling POST /v0/agents`
- **Fix:** Ensure the exported key matches the value on [Cursor Settings](https://cursor.com/settings). Keys starting with `cur_` are valid; rotate if unsure.

### 404 Not Found
- **Symptom:** `Resource not found for GET /v0/agents/bc_xyz`
- **Fix:** Verify the agent ID from `list` output. Remember that IDs are case-sensitive.

### Network Errors (`fetch failed`, `ENOTFOUND`)
- **Fix:** Confirm you can reach `https://api.cursor.com` (try `curl https://api.cursor.com/v0/me`). Check VPN/firewall rules and retry.

## Testing and Verification

### Run the Test Suite
```bash
bun test
```

### Focus on a Single Command Test
```bash
bun test src/commands/launch.test.ts
```

### Smoke-Test the Built CLI
```bash
bun run build
./cli.js list --non-interactive
```

### Verify Build Output Exists
```bash
bun run verify
```

If the issue persists, capture the full command with `--verbose` and include it in bug reports or pull requests.
