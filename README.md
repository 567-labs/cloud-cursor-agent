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
cloud-agent launch --plan <PLAN_FILE>
```

This will:

- Auto-detect the repository and ref from your current git directory
- Launch the agent in the background
- Output only the agent URL
- Exit immediately (non-blocking)

**Options:**

- `--plan <file>` - Plan file to use as prompt (required)
- `--repo <url>` - Repository URL (auto-detected if not provided)
- `--ref <ref>` - Git ref (branch/tag/commit) (auto-detected if not provided)
- `--branch <name>` - Target branch name
- `--auto-pr` - Automatically create PR when agent completes
- `--model <name>` - Model to use (e.g., claude-4-sonnet)
- `--verbose, -v` - Show verbose output
- `--dir <path>` - Working directory for git detection

**Examples:**

```bash
# Basic launch with auto-detection
cloud-agent launch --plan <PLAN_FILE>

# With explicit repository and ref
cloud-agent launch --plan <PLAN_FILE> --repo https://github.com/org/repo --ref main

# With auto-PR enabled
cloud-agent launch --plan <PLAN_FILE> --auto-pr

# Verbose mode
cloud-agent launch --plan <PLAN_FILE> --verbose
```

### List Agents

View agents for the current repository (auto-detected from git):

```bash
# Interactive mode (default) - filters by current repo
cloud-agent list

# Non-interactive mode (plain text output) - filters by current repo
cloud-agent list --non-interactive
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
cloud-agent status <agent-id>

# Non-interactive mode (plain text output)
cloud-agent status <agent-id> --non-interactive
```

**Example:**

```bash
cloud-agent status bc_abc123
cloud-agent status bc_abc123 --non-interactive
```

**Interactive mode keyboard shortcuts:**

- `q` - Go back/exit

### Interactive Mode

Launch the interactive agent list:

```bash
cloud-agent
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
cloud-agent --non-interactive

# Plain text output for list command
cloud-agent list --non-interactive

# Plain text output for status command
cloud-agent status bc_abc123 --non-interactive
```

Use `--non-interactive` (or `--no-interactive`) to get plain text output suitable for scripts and automation.

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
