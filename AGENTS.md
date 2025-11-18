# Cloud Agents Documentation

Cloud Agents are AI-powered assistants that work on GitHub repositories. They read code, make changes, create branches, and optionally open pull requests.

## Quick Start

```bash
# Set API key
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings

# Create plan file
echo "Fix type errors and add error handling" > plan.md

# Launch agent (PR created automatically)
cloud-agent launch --plan plan.md --branch feature/fixes
# Output: https://cursor.com/agents?id=bc_abc123
```

## Commands

### Launch

```bash
cloud-agent launch --plan <file> [options]
```

**Options:** `--repo <url>`, `--ref <ref>`, `--branch <name>`, `--no-auto-pr` (PR creation is default), `--model <name>`, `--verbose`, `--dir <path>`

**Examples:**

```bash
cloud-agent launch --plan plan.md  # PR created automatically
cloud-agent launch --plan plan.md --branch feature/new  # PR created automatically
cloud-agent launch --plan plan.md --no-auto-pr  # Disable PR creation
cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref main
```

### List

```bash
cloud-agent list [--non-interactive]
```

Shows agents filtered to current repository. Interactive: `↑↓` navigate, `q` exit, `r` refresh, `n` next page.

### Status

```bash
cloud-agent status <agent-id> [--non-interactive]
```

Shows agent details. Interactive: `q` to exit.

### Interactive Menu

```bash
cloud-agent
```

Opens interactive menu filtered to current repository.

## Plan Files

Markdown or text files describing tasks. Examples:

**Simple:**

```markdown
Fix these bugs:
- Authentication timeout
- Missing error handling
- Type errors
```

**Detailed:**

```markdown
# Feature: User Dashboard
1. Create dashboard component
2. Add API endpoint
3. Write unit tests
```

## Agent Statuses

- **CREATING** - Initializing
- **RUNNING** - Working on tasks
- **FINISHED** - Completed successfully
- **FAILED** - Error occurred
- **CANCELLED** - Cancelled

## Auto-Detection

Auto-detects repository and ref from git. Works with HTTPS (`https://github.com/org/repo.git`) and SSH (`git@github.com:org/repo.git`) remotes. Override with `--repo` and `--ref` flags.

## Non-Interactive Mode (Required for AI Agents)

**AI agents MUST use `--non-interactive`** for `list` and `status` commands. Without it, commands launch interactive UI and hang waiting for keyboard input.

**Why:**

1. No interactive UI - outputs plain text instead of keyboard-driven interface
2. Deterministic - executes immediately, exits with status codes
3. Parseable - structured text output easy to read programmatically
4. Non-blocking - completes immediately, no user input waits

**Usage:**

```bash
cloud-agent list --non-interactive
cloud-agent status bc_abc123 --non-interactive
cloud-agent launch --plan plan.md --branch feature/changes  # PR created automatically
```

**Important for AI Agents:**

- Always use `--non-interactive` for `list` and `status` commands
- PR creation is enabled by default - no need to specify `--auto-pr`
- Specify `--branch <name>` to create a feature branch for the changes
- Use `--no-auto-pr` only if you want to disable PR creation

**What happens without flag:**

- `list`/`status` → launches UI, hangs waiting for input
- `launch` → works fine (already non-interactive), creates PR by default

## Troubleshooting

**API Key Not Set:** `export CURSOR_API_KEY=your_key` ([get key](https://cursor.com/settings))

**Git Not Detected:** Ensure in git repo with `origin` remote, or use `--repo` and `--ref` flags

**Authentication Failed:** Verify API key is correct and not expired

**Rate Limit:** Wait for reset window (error shows retry timing)

**Plan File Not Found:** Check path, use absolute path if needed, verify read permissions

**Launch Failed:** Verify repo URL, check ref exists, ensure repo access, use `--verbose` for details

## Best Practices

- Keep plan files focused on specific tasks
- PR creation is enabled by default (use `--no-auto-pr` to disable)
- Monitor via agent URL in browser
- Use `--non-interactive` for scripts/automation
- List command auto-filters to current repository

## API Reference

Uses [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints). Key endpoints:

- `POST /v0/agents` - Launch agent
- `GET /v0/agents` - List agents
- `GET /v0/agents/{id}` - Get status
- `GET /v0/agents/{id}/conversation` - Get conversation
- `POST /v0/agents/{id}/followup` - Add follow-up

## Examples

**Quick bug fix:**

```bash
echo "Fix memory leak" > fix.md
cloud-agent launch --plan fix.md --branch feature/fix-memory-leak  # PR created automatically
```

**Feature with PR:**

```bash
cloud-agent launch --plan feature.md --branch feature/auth  # PR created automatically
```

**Script integration (AI agent example):**

```bash
AGENT_URL=$(cloud-agent launch --plan tasks.md --branch feature/automated-changes)
cloud-agent status $(echo $AGENT_URL | grep -o 'bc_[^?]*') --non-interactive
```

## Resources

- [API Documentation](https://cursor.com/docs/cloud-agent/api/endpoints)
- [Cursor Settings](https://cursor.com/settings) - Get API key
- [README](./README.md) - Installation guide
