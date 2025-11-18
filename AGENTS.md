# Cloud Agents Documentation

AI-powered assistants that work on GitHub repositories. They read code, make changes, create branches, and open pull requests.

## Quick Start

```bash
# If API key is in .zshrc, source it first
source ~/.zshrc

# Or set it directly
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings

bun run cloud-agent.tsx launch --plan plan/bug-fixes/type-errors.md
# Output: https://cursor.com/agents?id=bc_abc123
```

Once you can launch agents, branch out:

- `README.md` covers installation and day-to-day commands.
- `docs/EXAMPLES.md` supplies copy-ready command snippets.
- `docs/TROUBLESHOOTING.md` lists fixes for the most common run failures.

## Launch Command

```bash
bun run cloud-agent.tsx launch --plan <file>
```
- `plan/vim-support/vim-keybindings.md`

### Model Selection

The CLI automatically selects the appropriate model based on plan content. Models:

- `composer-1` (fast) - Simple tasks: bug fixes, small changes, typo corrections
- `gpt-5.1-codex` (smart) - Complex tasks: refactors, architecture changes, multi-step tasks (>5 steps)

Override with `--model`:

```bash
bun run cloud-agent.tsx launch --plan plan.md --model composer-1
bun run cloud-agent.tsx launch --plan plan.md --model gpt-5.1-codex
bun run cloud-agent.tsx launch --plan plan.md --model claude-4-sonnet
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

**STRICT RULE:** Only launch tasks that are **strictly parallel** - meaning they modify completely different files with zero overlap or dependencies. When a plan is well-defined and ready, launch automatically without waiting for confirmation.

### Example: One Plan per Change

```bash
# ✅ Docs-only change
bun run cloud-agent.tsx launch --plan plan/docs/add-examples.md

# ✅ Feature touching a distinct area
bun run cloud-agent.tsx launch --plan plan/feat/status-ui.md

# ❌ Do not run two plans if both modify src/components/AgentList.tsx
```

## Planning Best Practices

### Parallelization Rules

**Key Principle:** Only strictly parallel tasks are allowed. If two plans modify the same file (even different parts), they **cannot** run in parallel - they will create merge conflicts.

**Strictly Parallelizable (ONLY these):**

- Plans that modify completely different files (no file overlap)
- Plans that create new files without modifying any existing files
- Plans with zero shared dependencies
- Documentation-only changes (for example, updating `docs/API.md`) when no code files overlap

**NOT Parallelizable (common mistakes):**

- Multiple plans modifying the same file (even different functions/lines)
- Plans that modify different parts of the same file
- Plans that create new files but also modify a shared existing file
- Plans with any shared file dependencies
- Plans that depend on outputs from other plans

### Organizing Large Refactorings

For large refactorings that touch the same file, use a **phased approach** with sequential execution:

**Phase 1: Extract Utilities** (must complete before Phase 2)

- Extract utility functions to new files
- Creates new files and modifies the original file (removes code, adds imports)
- **Cannot run in parallel** with Phase 2 because both modify the same file
- Example: Extract grouping + layout utilities together in one plan

**Phase 2: Extract Components/Hooks** (after Phase 1 completes)

- Extract components, hooks, and major structural changes
- Depends on Phase 1 utilities being available
- **Must wait** for Phase 1 to complete
- Example: Extract rendering components + input handlers + data fetching together in one plan

**Independent Tasks** (can run in parallel with phases)

- Tasks that don't modify any shared files
- Example: Splitting validation.ts into modules (completely independent, no file overlap)

### Plan Structure

**Good Plan:**

```markdown
# Refactor AgentList Phase 1: Extract Utilities

## Goals
- Move grouping functions to separate utility file
- Move layout functions to separate utility file

## Tasks
- Create `src/utils/grouping.ts` (new file)
- Create `src/utils/layout.ts` (new file)
- Update `src/components/AgentList.tsx` (remove code, add imports)

## Expected Outcome
- AgentList.tsx reduced by ~180-200 lines
- Utilities are reusable across components
```

**Bad Plan (causes conflicts):**

```markdown
# Extract Grouping Utilities
- Modify AgentList.tsx

# Extract Layout Utilities  
- Modify AgentList.tsx

# Extract Rendering Components
- Modify AgentList.tsx
```

These three plans conflict because they all modify the same file.

### Combining Related Changes

When multiple changes modify the same file, combine them into a single plan:

**Instead of:**

- Plan 1: Extract input handlers (modifies AgentList.tsx)
- Plan 2: Extract data fetching (modifies AgentList.tsx)
- Plan 3: Extract rendering (modifies AgentList.tsx)

**Do this:**

- Single Plan: Extract components and hooks (modifies AgentList.tsx once)

### Dependency Management

**Sequential Execution (required for same-file refactorings):**

1. Launch Phase 1 plan (utilities) - wait for completion
2. Launch Phase 2 plan (components/hooks) - after Phase 1 completes

**Example:**

```bash
# Phase 1: Single plan (modifies AgentList.tsx)
bun run cloud-agent.tsx launch --plan plan/refactor-phase1-utilities.md

# Wait for Phase 1 to complete, then launch Phase 2
# Phase 2: Single plan (modifies AgentList.tsx again)
bun run cloud-agent.tsx launch --plan plan/refactor-phase2-components.md

# Independent task: Can run in parallel with either phase (no file overlap)
bun run cloud-agent.tsx launch --plan plan/split-validation-modules.md
```

**Note:** Even if Phase 1 and Phase 2 modify different parts of AgentList.tsx, they cannot run in parallel because they modify the same file.

### Plan Checklist

Before launching multiple plans, verify **strictly**:

- [ ] No two plans modify the same file (even different parts)
- [ ] No file overlap between plans (check all files, not just main files)
- [ ] Dependencies are clearly identified and sequenced
- [ ] Related changes to the same file are combined into one plan
- [ ] Phases that modify the same file are sequenced (not parallel)
- [ ] Only truly independent tasks (zero file overlap) run in parallel

**When in doubt:** Combine plans that touch the same file, or sequence them sequentially.

## Quality of Life Commands

### Watch Command

The `watch` command blocks until an agent completes, making it perfect for chaining commands:

```bash
# Launch and wait for completion
AGENT_ID=$(bun run cloud-agent.tsx launch --plan plan.md)
bun run cloud-agent.tsx watch $AGENT_ID --verbose

# Use exit code to determine success
bun run cloud-agent.tsx watch $AGENT_ID && echo "Success!" || echo "Failed"
```

### Other Useful Commands

- `bun run cloud-agent.tsx followup <agent-id> <prompt>` - Add follow-up instructions
- `bun run cloud-agent.tsx conversation <agent-id>` - View agent conversation/logs
- `bun run cloud-agent.tsx open <agent-id>` - Open agent URL in browser
- `bun run cloud-agent.tsx delete <agent-id>` - Delete an agent
- `bun run cloud-agent.tsx cancel <agent-id>` - Cancel a running agent
- `bun run cloud-agent.tsx batch-delete --status FINISHED --force` - Delete multiple agents by status or repository

### Batch Delete Command

Delete multiple agents at once for cleanup:

```bash
# Preview what would be deleted
bun run cloud-agent.tsx batch-delete --status FINISHED --dry-run

# Delete all finished agents
bun run cloud-agent.tsx batch-delete --status FINISHED --force

# Delete all terminal status agents (FINISHED, FAILED, CANCELLED)
bun run cloud-agent.tsx batch-delete --status terminal --force

# Delete all agents for current repository
bun run cloud-agent.tsx batch-delete --repo https://github.com/org/repo --force
```

**Status options:** `FINISHED`, `FAILED`, `CANCELLED`, `CREATING`, `RUNNING`, or `terminal` (all terminal statuses)

## Troubleshooting

**API Key:** If the API key is not set, try `source ~/.zshrc` first (if your key is stored there). Otherwise, set it with `export CURSOR_API_KEY=your_key` ([get key](https://cursor.com/settings))

**Plan File Not Found:** Check path, use absolute path if needed. For heredoc (`--plan -`), ensure stdin is piped with `<<'EOF'`

**Git Not Detected:** Ensure in git repo with `origin` remote

**Authentication Failed:** Verify API key is correct and not expired

Need more? See `docs/TROUBLESHOOTING.md` for deeper diagnostics.

## End-to-End Workflow Example

1. **Draft the plan** at `plan/refactors/split-validation.md`.
2. **Launch** it and capture the agent id:
   ```bash
   AGENT_ID=$(bun run cloud-agent.tsx launch --plan plan/refactors/split-validation.md --model gpt-5.1-codex)
   ```
3. **Watch** progress with a gentle polling interval:
   ```bash
   bun run cloud-agent.tsx watch "$AGENT_ID" --interval 4000 --verbose
   ```
4. **Clarify** if the agent asks questions:
   ```bash
   bun run cloud-agent.tsx followup "$AGENT_ID" "Scope only includes src/utils/validation.ts"
   ```
5. **Review** the PR:
   ```bash
   bun run cloud-agent.tsx open "$AGENT_ID" --pr
   ```
6. **Clean up** after merge:
   ```bash
   bun run cloud-agent.tsx delete "$AGENT_ID"
   ```

## Non-Interactive Cheat Sheet

| Command | Why it matters | Snippet |
| --- | --- | --- |
| `list` | Avoids React Ink UI so scripts continue running | `bun run cloud-agent.tsx list --non-interactive` |
| `status` | Delivers parseable plain text for conditionals | `bun run cloud-agent.tsx status "$AGENT_ID" --non-interactive` |
| `conversation` | Prevents pagination UI inside logs | `bun run cloud-agent.tsx conversation "$AGENT_ID" --non-interactive` |

All other commands already behave non-interactively, but you can still add `--non-interactive` for clarity in CI logs.

## Plan Template

```markdown
refactor(<component>): <short summary>

## Goals
- ...
- ...

## Tasks
- [ ] Step-by-step change (one file per bullet)
- [ ] Update docs (`README.md`, `docs/EXAMPLES.md`)

## Definition of Done
- `bun run build && bun run verify`
- Documentation refreshed
```

## Helpful Links

- `README.md` – Install steps and everyday usage
- `docs/EXAMPLES.md` – Copy-ready command samples
- `docs/API.md` – Request/response reference for automation
- `docs/TROUBLESHOOTING.md` – Extended problem-solving tips
- `docs/CONTRIBUTING.md` – How to propose changes, run builds, and open PRs
