# Cloud Agents CLI

A React Ink-based CLI tool for managing Cursor Cloud Agents. Launch agents, list them, and view their status directly from your terminal.

## Installation

```bash
# Install Bun if you haven't already
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Build the CLI
bun run build
```

## Setup

Set your Cursor API key as an environment variable:

```bash
export CURSOR_API_KEY=your_api_key
```

You can obtain an API key from [Cursor Settings](https://cursor.com/settings).

## Usage

### Quick Launch (Primary Workflow)

Launch an agent from a plan file:

```bash
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
- `--model <name>` - Model to use (e.g., claude-4-sonnet)
- `--verbose, -v` - Show verbose output
- `--dir <path>` - Working directory for git detection

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
```

**Note**: The list command automatically filters agents to show only those for the current repository (detected from git). If you're not in a git repository, it will show all agents.

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

### Interactive Mode

Launch the interactive agent list:

```bash
bun run cloud-agent.tsx
```

This opens the agent list directly, filtered to the current repository. You can:

- View agents for the current repository (auto-detected from git)
- Navigate through the list

**Keyboard shortcuts:**

- `↑` / `↓` - Navigate agents
- `q` - Exit
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

See [AGENTS.md](./AGENTS.md) for detailed documentation on non-interactive mode and AI agent usage.

## Features

- **Quick Launch**: Background agent launches with minimal output
- **Auto-detection**: Automatically detects git repository and ref
- **Interactive UI**: Menu-driven interface for viewing agents
- **Error Handling**: Clear error messages for common issues
- **Validation**: Input validation for repository URLs and other parameters
- **Rate Limiting**: Handles API rate limits gracefully

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
```

**Note**: This project uses [Bun](https://bun.sh) as the runtime and bundler. Bun provides fast TypeScript/JSX support out of the box. The built `cli.js` file uses ESM and includes a shebang. When installed via `npm install` or `bun install`, the package manager creates a proper wrapper script. For local testing, use `bun run dev`.

## Project Structure

```text
├── cloud-agent.tsx          # Main CLI entry point
├── build-cli.ts             # Build script
├── src/
│   ├── api/
│   │   ├── client.ts        # API client implementation
│   │   └── schemas.ts       # TypeScript schemas
│   ├── components/
│   │   ├── App.tsx          # Main app component
│   │   ├── MainMenu.tsx     # Interactive menu
│   │   ├── AgentList.tsx    # Agent list display
│   │   ├── AgentStatus.tsx  # Agent status display
│   │   └── QuickLaunch.tsx  # Quick launch component
│   └── utils/
│       ├── git.ts           # Git detection utilities
│       ├── file.ts          # File reading utilities
│       └── validation.ts    # Input validation
└── package.json
```

## API Reference

This CLI uses the [Cursor Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints).

## License

ISC
