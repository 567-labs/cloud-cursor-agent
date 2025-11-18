# Cloud Agents CLI

A React Ink-based CLI tool for managing Cursor Cloud Agents. Launch agents, list them, and view their status directly from your terminal.

## Why use this?

This CLI enables **Agent Orchestration**: allowing you (or your agents) to programmatically kick off other parallel agents.

**Example: Managing Large Refactors**

A compelling use case is identifying multiple files that need independent changes (e.g., refactoring to smaller components or adding tests). Instead of one massive 10,000-line pull request, you can use this CLI to:

1.  **Identify** the distinct files or services that need work.
2.  **Launch** parallel "sub-agents" for each task using this CLI.
3.  **Receive** smaller, focused PRs that are easier to review.

## Installing as a CLI Tool

Install this tool globally so you can run `cloud-agent` from any directory:

### Prerequisites

- **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
- **Bun** (for building) - Install with: `curl -fsSL https://bun.sh/install | bash`

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/jxnl/cloud-cursor-agent.git
cd cloud-cursor-agent

# 2. Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash

# 3. Install dependencies and build
bun install
bun run build

# 4. Install globally (creates tarball, installs, and cleans up automatically)
npm run install:global

# 5. Verify installation
cloud-agent --help
```

**Note:** The `install:global` script automatically handles creating the package tarball, installing globally, and cleaning up. This is required because some dependencies (like `yoga-wasm-web` used by `ink`) need to be installed separately rather than bundled.

### Verify Installation

After installation, you should be able to run `cloud-agent` from any directory:

```bash
# Test from any directory
cd /tmp
cloud-agent --help

# Use it to launch an agent
cloud-agent launch --plan plan.md
```

## Setup

Set your Cursor API key as an environment variable:

```bash
export CURSOR_API_KEY=your_api_key
```

You can obtain an API key from [Cursor Settings](https://cursor.com/settings).

## Usage

After installation, you can use the `cloud-agent` command directly. If you built from source, use `./cli.js` or `bun run cloud-agent.tsx` instead.

### Quick Launch (Primary Workflow)

Launch an agent from a plan file:

```bash
# If installed globally
cloud-agent launch --plan <PLAN_FILE>

# If built from source
./cli.js launch --plan <PLAN_FILE>
# or
bun run cloud-agent.tsx launch --plan <PLAN_FILE>
```

This will:

- Auto-detect the repository and ref from your current git directory
- Launch the agent in the background
- Output only the agent URL
- Exit immediately (non-blocking)

**Options:**

- `--plan <file>` - Plan file to use as prompt (required). Use `-` to read from stdin (supports heredoc syntax)
- `--repo <url>` - Repository URL (auto-detected if not provided)
- `--ref <ref>` - Git ref (branch/tag/commit) (auto-detected if not provided)
- `--branch <name>` - Target branch name
- `--no-auto-pr` - Disable automatic PR creation (PR creation is default)
- `--model <name>` - Model to use (`composer-1` or `gpt-5.1-codex`). If not provided, model is auto-selected based on plan content
- `--verbose, -v` - Show verbose output
- `--dir <path>` - Working directory for git detection

**Model Auto-Selection:**

The CLI automatically selects the appropriate model based on plan content:

- `composer-1` (fast) - Simple tasks: bug fixes, small changes, typo corrections
- `gpt-5.1-codex` (smart) - Complex tasks: refactors, architecture changes, multi-step tasks (>5 steps)

The selection uses heuristics based on keywords, number of steps, and plan length. You can override with `--model` if needed.

**Examples:**

```bash
# Basic launch with auto-detection (PR created automatically)
bun run cloud-agent.tsx launch --plan <PLAN_FILE>

# Disable PR creation
bun run cloud-agent.tsx launch --plan <PLAN_FILE> --no-auto-pr

# Use heredoc syntax for inline plan content
bun run cloud-agent.tsx launch --plan - <<'EOF'
refactor(AgentList): extract status order constant and consolidate footer hints

- Extract DEFAULT_STATUS_ORDER constant to centralize status ordering
- Add getStatusDisplayOrder function for dynamic status ordering
- Consolidate footer hint text generation into single variable
- Improve maintainability by removing hardcoded status arrays
EOF
```

### List Agents

View agents for the current repository (auto-detected from git):

```bash
# Interactive mode (default) - filters by current repo
bun run cloud-agent.tsx list

# Non-interactive mode (plain text output) - filters by current repo
bun run cloud-agent.tsx list --non-interactive

# Search agents by name or summary (non-interactive mode only)
bun run cloud-agent.tsx list --non-interactive --search "refactor"
```

**Note**: The list command automatically filters agents to show only those for the current repository (detected from git). If you're not in a git repository, it will show all agents.

**Options:**

- `--non-interactive` / `--no-interactive` - Disable interactive mode (output plain text)
- `--search <query>` - Search agents by name or summary (non-interactive mode only)
- `--dir <path>` - Working directory for git detection

**Interactive mode keyboard shortcuts:**

- `↑` / `↓` - Navigate agents
- `q` - Return/exit
- `r` - Refresh list
- `n` - Next page (if pagination available)

### View Agent Status

View detailed status of a specific agent:

```bash
# Interactive mode (default)
bun run cloud-agent.tsx status <agent-id>

# Non-interactive mode (plain text output)
bun run cloud-agent.tsx status <agent-id> --non-interactive
```

**Example:**

```bash
bun run cloud-agent.tsx status bc_abc123
bun run cloud-agent.tsx status bc_abc123 --non-interactive
```

**Interactive mode keyboard shortcuts:**

- `q` - Go back/exit

### Watch Agent (Block Until Complete)

Watch one or more agents and block until they reach a terminal state (FINISHED, FAILED, or CANCELLED). Useful for chaining commands in scripts:

```bash
# Watch a single agent
bun run cloud-agent.tsx watch <agent-id>

# Watch multiple agents (space-separated IDs)
bun run cloud-agent.tsx watch <agent-id-1> <agent-id-2> <agent-id-3>

# With verbose output showing status changes
bun run cloud-agent.tsx watch <agent-id> --verbose

# Custom polling interval (default: 2000ms)
bun run cloud-agent.tsx watch <agent-id> --interval 5000
```

**Exit codes:**

- `0` if all agents finished successfully (FINISHED)
- `1` if any agent failed or was cancelled (FAILED/CANCELLED)

**Example workflow:**

```bash
# Single agent
AGENT_ID=$(bun run cloud-agent.tsx launch --plan plan.md)
bun run cloud-agent.tsx watch $AGENT_ID --verbose && echo "Agent completed successfully!"

# Multiple agents
AGENT_1=$(bun run cloud-agent.tsx launch --plan plan1.md)
AGENT_2=$(bun run cloud-agent.tsx launch --plan plan2.md)
bun run cloud-agent.tsx watch $AGENT_1 $AGENT_2 --verbose
```

### Add Follow-up Instructions

Add a follow-up instruction to a running agent:

```bash
# Direct text
bun run cloud-agent.tsx followup <agent-id> "Please also add tests"

# From file (prefix with @)
bun run cloud-agent.tsx followup <agent-id> @followup-instructions.md

# From stdin
bun run cloud-agent.tsx followup <agent-id> - <<'EOF'
Please add error handling
EOF
```

### View Agent Conversation

View the conversation history between you and the agent:

```bash
# Interactive mode (default)
bun run cloud-agent.tsx conversation <agent-id>

# Plain text output
bun run cloud-agent.tsx conversation <agent-id> --non-interactive
```

### Open Agent URL

Open the agent's URL in your default browser:

```bash
# Open agent URL
bun run cloud-agent.tsx open <agent-id>

# Open PR URL (if available)
bun run cloud-agent.tsx open <agent-id> --pr
```

### Delete Agent

Delete an agent:

```bash
# Delete completed agent
bun run cloud-agent.tsx delete <agent-id>

# Force delete (even if running)
bun run cloud-agent.tsx delete <agent-id> --force
```

### Cancel Agent

Cancel a running agent (note: cancellation may not be supported by the API yet):

```bash
bun run cloud-agent.tsx cancel <agent-id>
```

### Batch Delete Agents

Delete multiple agents by status or repository. Useful for cleaning up completed agents:

```bash
# Delete all finished agents (dry run to preview)
bun run cloud-agent.tsx batch-delete --status FINISHED --dry-run

# Delete all finished agents
bun run cloud-agent.tsx batch-delete --status FINISHED --force

# Delete all terminal status agents (FINISHED, FAILED, CANCELLED)
bun run cloud-agent.tsx batch-delete --status terminal --force

# Delete all failed agents for current repository
bun run cloud-agent.tsx batch-delete --status FAILED --force

# Delete all agents for a specific repository
bun run cloud-agent.tsx batch-delete --repo https://github.com/org/repo --force

# Delete all finished agents (limit to first 50)
bun run cloud-agent.tsx batch-delete --status FINISHED --limit 50 --force
```

**Options:**

- `--status <status>` - Filter by status: `FINISHED`, `FAILED`, `CANCELLED`, `CREATING`, `RUNNING`, or `terminal` (all terminal statuses)
- `--repo <url>` - Filter by repository URL (auto-detected from git if not provided)
- `--dry-run` - Preview what would be deleted without actually deleting
- `--force` - Skip confirmation prompt (required for actual deletion)
- `--limit <number>` - Maximum number of agents to fetch (default: 100)
- `--dir <path>` - Working directory for git detection

**Note:** The `--force` flag is required to actually delete agents. Without it, the command will show what would be deleted and exit.

### API Key Information

Show information about the current API key:

```bash
bun run cloud-agent.tsx me
```

This displays:

- API key name
- Associated email address
- Creation date

### List Available Models

List all available models for cloud agents:

```bash
bun run cloud-agent.tsx list-models
```

This shows all models that can be used with the `--model` flag when launching agents. The output includes a tip about using models with the launch command.

### Install Agents MD

Generate and append CLI usage instructions to AGENTS.md based on available commands. This is useful for keeping documentation up-to-date with the current CLI capabilities:

```bash
# Install to default AGENTS.md file
bun run cloud-agent.tsx install-agents-md

# Install to custom file
bun run cloud-agent.tsx install-agents-md --file docs/CLI.md

# Specify working directory
bun run cloud-agent.tsx install-agents-md --dir /path/to/repo

# Force overwrite existing instructions
bun run cloud-agent.tsx install-agents-md --force
```

**Options:**

- `--file <path>` - Path to AGENTS.md file (default: AGENTS.md)
- `--dir <path>` - Working directory for file operations
- `--force` - Force installation even if instructions already exist (overwrites existing instructions)

This command:

- Checks which commands are available in the CLI
- Generates comprehensive usage instructions for AI agents
- Includes guidance on how to think about making plans
- Includes instructions on how to kick off plans
- Appends or updates the "CLI Usage for AI Agents" section in AGENTS.md

**Note:** The command can also be accessed from the interactive menu.

### Interactive Mode

Launch the interactive menu:

```bash
bun run cloud-agent.tsx
```

This opens an interactive menu where you can:

- **List Agents (This Repo)** - View agents for the current repository (auto-detected from git)
- **List Agents (All)** - View all agents across all repositories
- **API Key Info** - View information about your current API key
- **List Models** - View available models for cloud agents
- **Install Agents MD** - Generate and update CLI usage instructions in AGENTS.md
- **Exit** - Exit the menu

**Menu navigation:**

- `↑` / `↓` or `j` / `k` - Navigate menu options
- `Enter` - Select option
- `q` or `Escape` - Exit

**Agent list keyboard shortcuts:**

- `↑` / `↓` - Navigate agents
- `q` - Return to menu
- `r` - Refresh list
- `n` - Next page (if pagination available)

### Non-Interactive Mode

Disable interactive mode for scripting and automation:

```bash
# Show help instead of interactive list
bun run cloud-agent.tsx --non-interactive

# Plain text output for list command
bun run cloud-agent.tsx list --non-interactive

# Plain text output for status command
bun run cloud-agent.tsx status bc_abc123 --non-interactive
```

Use `--non-interactive` (or `--no-interactive`) to get plain text output suitable for scripts and automation.

#### Why AI Agents Must Use `--non-interactive`

When AI agents (automated assistants, CI/CD systems, or other programmatic tools) run the Cloud Agents CLI, they **must** use the `--non-interactive` flag:

1. **No Interactive UI**: Without `--non-interactive`, the CLI launches a React Ink interactive terminal UI that requires keyboard input. AI agents cannot interact with keyboard-driven UIs and need plain text output.

2. **Deterministic Behavior**: Interactive mode waits for user input, causing AI agents to hang indefinitely. Non-interactive mode executes immediately and exits with proper status codes.

3. **Parseable Output**: Interactive mode uses terminal formatting (colors, boxes, navigation) that's hard to parse. Non-interactive mode outputs structured plain text that's easy for AI agents to read and process.

4. **Exit Codes**: Non-interactive mode uses proper exit codes (0 for success, 1 for error), which AI agents rely on to determine success/failure.

5. **No Blocking**: Interactive mode blocks waiting for user input. Non-interactive mode completes immediately and returns control.

**Required for AI Agents:**

- `bun run cloud-agent.tsx list --non-interactive` - Always use this flag
- `bun run cloud-agent.tsx status <id> --non-interactive` - Always use this flag
- `bun run cloud-agent.tsx launch --plan <file>` - Already non-interactive by design, PR creation is default

**What happens without `--non-interactive`:**

- `list` and `status` commands will launch interactive UI and hang waiting for keyboard input
- AI agents cannot proceed past these commands

## For AI Agents

**CRITICAL:** AI agents must use `--non-interactive` flag for all commands that support it. See the "Non-Interactive Mode" section above for details.

### Essential Commands for AI Agents

**Launch an agent:**

```bash
bun run cloud-agent.tsx launch --plan <plan-file>
# Outputs: agent URL (e.g., https://cursor.com/agents?id=bc_abc123)
# Exit code: 0 on success, 1 on error
```

**Watch agent(s) until completion:**

```bash
# Single agent
bun run cloud-agent.tsx watch <agent-id> --verbose

# Multiple agents (space-separated)
bun run cloud-agent.tsx watch <agent-id-1> <agent-id-2> --verbose

# Exit code: 0 if all finished successfully, 1 if any failed/cancelled
```

**List agents (non-interactive):**

```bash
bun run cloud-agent.tsx list --non-interactive

# With search
bun run cloud-agent.tsx list --non-interactive --search "refactor"
```

**Check agent status (non-interactive):**

```bash
bun run cloud-agent.tsx status <agent-id> --non-interactive
```

**Add follow-up instructions:**

```bash
bun run cloud-agent.tsx followup <agent-id> "Please add tests"
```

**View agent conversation:**

```bash
bun run cloud-agent.tsx conversation <agent-id> --non-interactive
```

### Parallelization Rules (CRITICAL)

**STRICT RULE:** Only launch tasks that are **strictly parallel** - meaning they modify completely different files with zero overlap or dependencies.

**Can run in parallel:**

- Plans that modify completely different files (no file overlap)
- Plans that create new files without modifying any existing files
- Plans with zero shared dependencies

**CANNOT run in parallel:**

- Multiple plans modifying the same file (even different functions/lines)
- Plans that modify different parts of the same file
- Plans that create new files but also modify a shared existing file
- Plans with any shared file dependencies
- Plans that depend on outputs from other plans

**For same-file refactorings:** Use a phased approach - launch Phase 1, wait for completion, then launch Phase 2.

### Model Selection

The CLI auto-selects models based on plan content:

- `composer-1` (fast) - Simple tasks: bug fixes, small changes, typo corrections
- `gpt-5.1-codex` (smart) - Complex tasks: refactors, architecture changes, multi-step tasks (>5 steps)

Override with `--model` if needed:

```bash
bun run cloud-agent.tsx launch --plan plan.md --model composer-1
```

### Complete Documentation

See [AGENTS.md](./AGENTS.md) for comprehensive documentation including:

- Detailed parallelization rules and examples
- Plan structure best practices
- Phased refactoring strategies
- Complete command reference
- Test writing guidelines
- Troubleshooting guide

## Features

- **Quick Launch**: Background agent launches with minimal output
- **Auto-detection**: Automatically detects git repository and ref
- **Model Auto-Selection**: Automatically selects the appropriate model based on plan complexity
- **Interactive UI**: Menu-driven interface for viewing agents and accessing information
- **Search**: Fuzzy search agents by name or summary (non-interactive mode)
- **Multi-Agent Watch**: Watch multiple agents simultaneously
- **API Key Management**: View API key information and verify authentication
- **Model Discovery**: List available models for cloud agents
- **Error Handling**: Clear error messages for common issues
- **Validation**: Input validation for repository URLs, plan files, and other parameters
- **Rate Limiting**: Handles API rate limits gracefully
- **Comprehensive Testing**: Full test coverage with Bun's test runner and React Testing Library

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Verify build (checks that cli.js exists and is executable)
bun run verify

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Format code
bun run format

# Check code formatting
bun run format:check
```

**Note**: This project uses [Bun](https://bun.sh) as the runtime and bundler. Bun provides fast TypeScript/JSX support out of the box. The built `cli.js` file uses ESM and includes a shebang. When installed via `npm install` or `bun install`, the package manager creates a proper wrapper script. For local testing, use `bun run dev`.

## Project Structure

```text
├── cloud-agent.tsx          # Main CLI entry point
├── build-cli.ts             # Build script
├── cli.js                   # Built executable (generated)
├── src/
│   ├── api/
│   │   ├── client.ts        # API client implementation
│   │   ├── client.test.ts   # API client tests
│   │   └── schemas.ts       # TypeScript schemas
│   ├── cli/
│   │   └── types.ts         # CLI type definitions
│   ├── commands/
│   │   ├── index.ts         # Command registry
│   │   ├── base.ts          # Base command utilities
│   │   ├── launch.ts        # Launch command
│   │   ├── list.tsx          # List command (interactive)
│   │   ├── status.tsx       # Status command (interactive)
│   │   ├── watch.ts         # Watch command
│   │   ├── cancel.ts        # Cancel command
│   │   ├── followup.ts      # Followup command
│   │   ├── conversation.ts  # Conversation command
│   │   ├── open.ts          # Open command
│   │   ├── delete.ts        # Delete command
│   │   ├── batch-delete.ts   # Batch delete command
│   │   ├── me.ts            # API key info command
│   │   ├── list-models.ts   # List models command
│   │   └── *.test.ts        # Command tests
│   ├── components/
│   │   ├── App.tsx          # Main app component
│   │   ├── MainMenu.tsx     # Interactive menu
│   │   ├── AgentList.tsx    # Agent list display
│   │   ├── AgentList/
│   │   │   ├── AgentGroup.tsx      # Agent group component
│   │   │   ├── AgentItem.tsx       # Agent item component
│   │   │   ├── AgentItemDetails.tsx # Agent details component
│   │   │   ├── AgentListHeader.tsx  # List header component
│   │   │   ├── AgentListFooter.tsx # List footer component
│   │   │   └── EmptyState.tsx      # Empty state component
│   │   ├── AgentStatus.tsx   # Agent status display
│   │   ├── AgentStatus.tsx  # Agent status component
│   │   ├── ApiKeyInfo.tsx   # API key info component
│   │   ├── ModelsList.tsx  # Models list component
│   │   ├── QuickLaunch.tsx  # Quick launch component
│   │   ├── Spinner.tsx      # Loading spinner component
│   │   └── *.test.tsx       # Component tests
│   ├── hooks/
│   │   ├── useAgentList.ts        # Agent list hook
│   │   ├── useAgentListInput.ts   # Agent list input handling hook
│   │   ├── useAgentPolling.ts    # Agent polling hook
│   │   ├── useTerminalDimensions.ts # Terminal dimensions hook
│   │   └── *.test.ts        # Hook tests
│   ├── test/
│   │   ├── mocks/
│   │   │   └── ink.ts       # Ink component mocks
│   │   ├── setup.ts         # Test setup
│   │   └── utils.tsx        # Test utilities
│   └── utils/
│       ├── agentFiltering.ts      # Agent filtering utilities
│       ├── browser.ts             # Browser utilities
│       ├── file.ts                # File reading utilities
│       ├── formatting.ts          # Text formatting utilities
│       ├── git.ts                 # Git detection utilities
│       ├── grouping.ts            # Agent grouping utilities
│       ├── layout.ts              # Layout utilities
│       ├── model.ts               # Model selection utilities
│       ├── search.ts              # Search/fuzzy matching utilities
│       ├── status.ts              # Status display utilities
│       ├── validation/
│       │   ├── common.ts          # Common validation
│       │   ├── git.ts             # Git validation
│       │   ├── index.ts           # Validation exports
│       │   ├── plan.ts            # Plan validation
│       │   └── repository.ts      # Repository validation
│       ├── validation.ts          # Main validation utilities
│       └── *.test.ts              # Utility tests
├── plan/                        # Plan files directory
└── package.json
```

## API Reference

This CLI uses the [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints).

## License

ISC
