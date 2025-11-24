# Cloud Agents CLI

CLI for managing Cursor Cloud Agents. Launch AI agents that work on GitHub repos, create branches, and open PRs. **You review and merge the PRs yourself.**

## Why?

Offload small tasks to parallel agents while you focus on your main work. Each agent creates its own branch and PR. Review and merge when ready.

## Installation

Install globally from npm:

```bash
npm install -g cloud-agent
```

**Prerequisites:** Node.js v18+

## Setup

```bash
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings
```

## Commands

### Launch

```bash
cloud-agent launch --plan plan.md
# Output: https://cursor.com/agents?id=bc_abc123
```

Heredoc syntax:

```bash
cloud-agent launch --plan - <<'EOF'
fix: update error message

- Change text in src/auth/login.ts
EOF
```

**Options:** `--repo`, `--ref`, `--branch`, `--model`, `--no-auto-pr`, `--verbose`

**Models:** Auto-selected based on plan complexity. `composer-1` (fast) for simple tasks, `claude-4.5-opus-high` (smart) for complex tasks. Override with `--model`.

### Watch

Block until agent completes:

```bash
cloud-agent watch <agent-id>
cloud-agent watch <id1> <id2> --verbose  # Multiple agents
```

### List & Status

```bash
cloud-agent list                              # Interactive
cloud-agent list --non-interactive            # Plain text
cloud-agent status <agent-id> --non-interactive
```

### Other Commands

```bash
cloud-agent followup <agent-id> --messages "Add tests"
cloud-agent conversation <agent-id>
cloud-agent open <agent-id>              # Open in browser
cloud-agent open <agent-id> --pr         # Open PR
cloud-agent delete <agent-id>
cloud-agent cancel <agent-id>
cloud-agent batch-delete --status FINISHED --force
cloud-agent me                           # API key info
cloud-agent list-models
```

## Critical Rule

**Only launch tasks that modify completely different files.** If two plans touch the same file (even different parts), run them sequentially, not in parallel.

## Adding to Your Project's AGENTS.md

Generate and append the AGENTS.md template to your project:

```bash
cloud-agent agents-md >> AGENTS.md
```

Or view it first:

```bash
cloud-agent agents-md
```

The template includes detailed instructions on plan structure, examples, and best practices for organizing plans in a `plan/` directory.

## Development

```bash
bun install                           # Install dependencies
bun cloud-agent.tsx <command>        # Run in development mode
bun run build                         # Build CLI
bun test                              # Run tests
bun run format                        # Format code
```

**Examples:**

```bash
cloud-agent list-models               # List available models
cloud-agent launch --plan plan.md     # Launch an agent
cloud-agent list                      # Interactive list
```

## API Reference

[Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints)

## License

MIT
