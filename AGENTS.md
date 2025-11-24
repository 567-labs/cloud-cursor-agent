# Cloud Agents

AI agents that work on GitHub repos. They read code, make changes, create branches, and open PRs. **You must review and merge the PRs yourself.**

## Quick Start

```bash
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings

cloud-agent launch --plan plan.md
# Output: https://cursor.com/agents?id=bc_abc123
```

## Heredoc Syntax

```bash
cloud-agent launch --plan - <<'EOF'
fix: update error message

- Change text in src/auth/login.ts
EOF
```

## Model Selection

Auto-selected based on plan content. Override with `--model`:

- `composer-1` (fast) - Simple tasks: bug fixes, typos
- `claude-4.5-opus-high` (smart) - Complex tasks: refactors, architecture changes

## Critical Rule: Parallelization

**Only launch tasks that modify completely different files.** If two plans touch the same file (even different parts), run them sequentially.

**Parallel OK:**
- Plans that modify completely different files
- Plans that create new files without modifying existing files

**NOT OK:**
- Multiple plans modifying the same file (even different functions)
- Plans that depend on outputs from other plans

### Same-File Refactorings

Use a phased approach:

```bash
# Phase 1
cloud-agent launch --plan phase1.md
cloud-agent watch $AGENT_ID

# Phase 2 (after Phase 1 completes)
cloud-agent launch --plan phase2.md
```

## Commands

### Watch

Block until agent completes:

```bash
cloud-agent watch $AGENT_ID --verbose
cloud-agent watch $ID1 $ID2  # Multiple agents
```

### Followup

Send instructions to running agents:

```bash
cloud-agent followup <agent-id> --messages "Add tests"
cloud-agent followup <agent-id> --messages @instructions.md
```

### Other Commands

```bash
cloud-agent conversation <agent-id>   # View conversation
cloud-agent open <agent-id>           # Open in browser
cloud-agent open <agent-id> --pr      # Open PR
cloud-agent delete <agent-id>
cloud-agent cancel <agent-id>
cloud-agent batch-delete --status FINISHED --force
```
