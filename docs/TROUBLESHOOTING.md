# Troubleshooting Guide

Use this guide when the CLI or API behaves unexpectedly. Each section lists symptoms, quick diagnostics, and fixes. Keep a terminal open so you can run the suggested commands verbatim.

## Quick Checklist

1. Confirm `CURSOR_API_KEY` is set in the current shell: `env | grep CURSOR_API_KEY`.
2. Make sure you are inside a git repository if you rely on auto-detected repo/ref.
3. Prefer `--non-interactive` when another process (CI, AI agent) drives the CLI.
4. Re-run with `--verbose` to surface HTTP errors from the API.

## Missing or Invalid API Key

**Symptoms**
- CLI exits with `API key is required` or `Authentication failed`.
- API calls return HTTP `401`.

**Diagnostics**

```bash
echo ${CURSOR_API_KEY:-"(not set)"}
```

**Fix**
- Export the key in your shell profile: `echo 'export CURSOR_API_KEY=sk-...' >> ~/.zshrc`.
- Re-source the profile (`source ~/.zshrc`) or restart the terminal.
- In CI, store the key in a secret manager and inject it as an environment variable before running any commands.

## Repository Not Detected

**Symptoms**
- CLI warns `Git repository not detected` or launches agents against the wrong repo.

**Diagnostics**

```bash
git status
```

**Fix**
- Run commands from the repository root so `.git` is accessible.
- Override detection with `--repo https://github.com/org/repo --ref main`.
- When running outside the repo tree (e.g., from a parent cron job), pass `--dir /path/to/repo`.

## Interactive Mode Blocking Automation

**Symptoms**
- Scripts hang with no output.
- Running `list` or `status` never exits when executed in CI/CD or by another AI agent.

**Fix**
- Always append `--non-interactive` (or `--no-interactive`) to `list`, `status`, and `conversation` when you do not have a keyboard attached.
- To check what a command would show interactively, run it locally without the flag first.

## Launch Command Fails Immediately

**Common causes**
- Invalid plan path.
- JSON or heredoc formatting issues.
- Repository lacks required permissions for the API key.

**Diagnostics**

```bash
bun run cloud-agent.tsx launch --plan plan.md --verbose
```

**Fix**
- Verify the plan path exists (`ls plan/`).
- When sending heredoc content, wrap it with `<<'EOF'` to avoid shell expansion.
- Confirm the API key has write access to the repository (especially for private repos).

## Rate Limit Errors (`429`)

**Symptoms**
- CLI prints `Rate limit exceeded. Please try again later.`
- API response header includes `Retry-After`.

**Fix**
- Back off according to `Retry-After`.
- Batch `list` and `status` calls instead of polling every second. Use `watch --interval 5000` for longer intervals.
- Cache results from `GET /v0/repositories`; it only changes when your GitHub access changes.

## Webhook Delivery Problems

**Symptoms**
- You never receive webhook notifications even though agents finish.

**Diagnostics**
- Check the launch payload to ensure `webhook.url` is set.
- Verify that the URL is publicly reachable and returns `2xx` within 5 seconds.

**Fix**
- Regenerate your webhook secret (minimum 32 characters) and update the receiver to validate HMAC signatures.
- Use a tunneling tool (such as `ngrok`) while testing locally.
- Inspect server logs for rejected requests.

## Model Not Available

**Symptoms**
- Launch call fails with `model is not available`.

**Fix**
- Run `bun run cloud-agent.tsx launch --plan plan.md --model composer-1` (or another model listed by `GET /v0/models`).
- Remove the `--model` flag to let the platform auto-select an appropriate model.

## Agents Stuck in `RUNNING`

**Steps**
1. Check the live conversation: `bun run cloud-agent.tsx conversation <id> --non-interactive`.
2. If the agent is blocked waiting for context, send a follow-up instruction: `bun run cloud-agent.tsx followup <id> "Clarify the task"`.
3. If you no longer need the run, cancel it: `bun run cloud-agent.tsx cancel <id>` (if supported) or delete it.

## Still Stuck?

Document the command, full output, and recent changes, then open an issue or follow the steps in `docs/CONTRIBUTING.md` to get help. Include:

- CLI version (`bun --version` and `cat package.json | jq '.version'`)
- Operating system and shell
- A sanitized copy of your plan (omit secrets)
