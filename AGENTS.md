# Cloud Agents Documentation

AI-powered assistants that work on GitHub repositories. They read code, make changes, create branches, and open pull requests.

## Quick Start

```bash
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings
bun run cloud-agent.tsx launch --plan plan/bug-fixes/type-errors.md
# Output: https://cursor.com/agents?id=bc_abc123
```

## Launch Command

```bash
bun run cloud-agent.tsx launch --plan <file>
```

Creates PR automatically. Plan files should be organized in `plan/{feature}/{plan}.md` structure:

- `plan/bug-fixes/type-errors.md`
- `plan/bug-fixes/add-error-handling.md`

### Model Selection

The CLI automatically selects the appropriate model based on plan content. Models:

- `composer-1` (fast) - Simple tasks: bug fixes, small changes, typo corrections
- `gpt-5.1-codex` (smart) - Complex tasks: refactors, architecture changes, multi-step tasks (>5 steps)

Override with `--model`:

```bash
bun run cloud-agent.tsx launch --plan plan.md --model composer-1
bun run cloud-agent.tsx launch --plan plan.md --model gpt-5.1-codex
```

### Heredoc Syntax

Pass plan content directly via stdin:

```bash
bun run cloud-agent.tsx launch --plan - <<'EOF'
refactor(AgentList): extract status order constant

- Extract DEFAULT_STATUS_ORDER constant
- Add getStatusDisplayOrder function
- Consolidate footer hint text generation
EOF
```

## When to Launch Tasks

Only launch tasks that are parallelizable and have no dependencies. When a plan is well-defined and ready, launch automatically without waiting for confirmation.

## Troubleshooting

**API Key:** `export CURSOR_API_KEY=your_key` ([get key](https://cursor.com/settings)). If not found, try `source ~/.zshrc`

**Plan File Not Found:** Check path, use absolute path if needed. For heredoc (`--plan -`), ensure stdin is piped with `<<'EOF'`

**Git Not Detected:** Ensure in git repo with `origin` remote

**Authentication Failed:** Verify API key is correct and not expired
