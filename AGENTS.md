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

### Using Heredoc Syntax

You can also pass plan content directly using heredoc syntax by using `-` to read from stdin:

```bash
bun run cloud-agent.tsx launch --plan - <<'EOF'
refactor(AgentList): extract status order constant and consolidate footer hints

- Extract DEFAULT_STATUS_ORDER constant to centralize status ordering
- Add getStatusDisplayOrder function for dynamic status ordering
- Consolidate footer hint text generation into single variable
- Improve maintainability by removing hardcoded status arrays
EOF
```

This is useful for inline plan content without creating a separate file.

## When to Launch Tasks

Tasks should only be kicked off if they are very parallelizable and do not have any dependencies.

**Confidence in Launching:** When a plan is well-defined and ready, you should confidently launch the task yourself without waiting for explicit user confirmation. If the plan is clear, complete, and follows the proper structure, proceed with launching the cloud agent automatically.

## Troubleshooting

**API Key Not Set:** `export CURSOR_API_KEY=your_key` ([get key](https://cursor.com/settings)). If API key is not found, try `source ~/.zshrc`

**Plan File Not Found:** Check path, use absolute path if needed, verify read permissions. When using heredoc syntax (`--plan -`), ensure stdin is properly piped (e.g., using `<<'EOF'`)

**Git Not Detected:** Ensure in git repo with `origin` remote

**Authentication Failed:** Verify API key is correct and not expired
