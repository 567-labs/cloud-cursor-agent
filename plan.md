# Cloud Agents CLI Implementation Plan

## Overview

Build a React Ink-based CLI tool for managing Cursor Cloud Agents. The CLI will allow users to list agents, launch new agents, and display the URLs needed to view agents in the browser. The CLI will auto-detect repository and ref information from the working directory when not explicitly provided.

**Primary Use Case**: The main workflow is `cloud-agent launch --plan plan.md` which launches a background agent and returns the URL. This allows developers to quickly kick off agents while working, passing a `plan.md` file (or any text file) as the prompt, and immediately getting the agent URL without interrupting their workflow.

## Implementation Phases

This plan is organized into 5 phases, each building on the previous, but **Phase 1 is prioritized** so the cloud launch workflow works before we build anything else.

- **Phase 1: Cloud Launch Workflow & API Client** - API client, schemas, and quick-launch CLI functionality
- **Phase 2: Utilities & Detection** - Git detection and file reading utilities that support launch
- **Phase 3: Interactive UI Components** - Menu-driven interface for viewing agents (list UI)
- **Phase 4: Polish & Error Handling** - Error handling, validation, and testing
- **Phase 5: Reference & Future Considerations** - Documentation, references, and follow-ups

---

## Phase 1: Cloud Launch Workflow & API Client

**Goal**: Deliver the cloud launch workflow first by establishing the schemas, API client, and non-interactive CLI.

### Tasks

#### 1.1 Create Schema Definitions File
**File**: `src/api/schemas.ts`
- Export all TypeScript interfaces and types (AgentStatus, AgentSource, AgentTarget, Agent, ListAgentsResponse, Prompt, LaunchAgentRequest, etc.)
- Include validation helpers if needed (using zod or similar)
- Document each schema with JSDoc comments

#### 1.2 Create API Client Module
**File**: `src/api/client.ts`
- Create a typed API client class that handles:
  - Basic authentication using API key from environment variable (`CURSOR_API_KEY`)
  - Base URL: `https://api.cursor.com`
  - Request/response handling with proper error handling
  - All endpoint methods with proper TypeScript types

**Methods to implement**:
- `listAgents(limit?: number, cursor?: string): Promise<ListAgentsResponse>`
- `getAgentStatus(id: string): Promise<Agent>`
- `launchAgent(request: LaunchAgentRequest): Promise<Agent>`

#### 1.3 Update Package Configuration
**File**: `package.json`
- Add any missing dependencies (e.g., `zod` for schema validation if desired)
- Update scripts if needed
- Ensure `bin` entry point is correct

#### 1.4 Implement Quick Launch CLI
**Files**: `src/components/QuickLaunch.tsx`, `cloud-agent.tsx`, `build-cli.ts`
- Build the `QuickLaunch` component that accepts a plan file, launches an agent immediately, and prints only the agent URL (the primary workflow).
- Update `cloud-agent.tsx` to include the `launch --plan` subcommand, handle CLI flags (`--repo`, `--ref`, `--branch`, `--auto-pr`, `--model`, etc.), and emit only the agent URL before exiting.
- Use `build-cli.ts` to include new sources in the build and ensure permissions.
- Ensure the CLI auto-detects repo/ref unless overridden, handles the API client, and exits quickly in quick-launch mode.

**Deliverable**: Working API client that can authenticate and make requests to all three endpoints. Make a PR.

---

## Phase 2: Utilities & Detection

**Goal**: Implement utilities for auto-detecting repository/ref and reading plan files.

### Tasks

#### 2.1 Create Git Detection Utility
**File**: `src/utils/git.ts`
- Reuse and enhance the existing `detectGitHubRepo()` function from `cli.tsx`
- Extract `parseWorkingLocation()` function for reuse
- Create helper function `detectRepoAndRef(workingDir: string): Promise<{ repository: string; ref: string } | null>`
- Handle edge cases (SSH URLs, different Git config formats)

#### 2.2 Create File Reading Utility
**File**: `src/utils/file.ts`
- Create function `readPlanFile(filePath: string): Promise<string>` to read prompt text from file
- Handle relative and absolute paths
- Support common markdown/text files (`.md`, `.txt`, etc.)
- Provide clear error messages for missing files or read errors
- Optionally strip frontmatter from markdown files if present

**Deliverable**: Utilities that can detect git repo/ref and read plan files reliably. Make a PR.

---

---

## Phase 3: Interactive UI Components

**Goal**: Build the interactive menu-driven interface for viewing agents using React Ink.

### Tasks

#### 4.1 Create Main Menu Component
**File**: `src/components/MainMenu.tsx`
- Main menu component with options:
  - List agents
  - Exit
- Use arrow keys for navigation, Enter to select
- Centered menu with clear title
- Arrow indicator (`>`) shows selected option
- Highlight selected option with highlight color (cyan)
- Dim unselected options with medium gray
- Note: Launch agent functionality is available via CLI commands (`launch --plan`), not through interactive menu

#### 4.2 Create Agent List Component
**File**: `src/components/AgentList.tsx`
- Display list of agents in a table-like format using Ink's `Box` and `Text` components
- Show: ID, name, status (with color coding), repository, branch, and most importantly the `target.url`
- Handle pagination if `nextCursor` is present
- Allow keyboard navigation (arrow keys, enter to select)
- Status shown with symbols and text, not colors:
  - `CREATING`: `[●] CREATING` (medium gray)
  - `RUNNING`: `[▶] RUNNING` (medium gray)
  - `FINISHED`: `[✓] FINISHED` (medium gray)
  - `FAILED`: `[✗] FAILED` (medium gray)
  - `CANCELLED`: `[○] CANCELLED` (medium gray)
- Agent URL displayed prominently below each agent in highlight color (cyan)

#### 4.3 Integrate Interactive Mode into CLI
**File**: `cloud-agent.tsx`
- When no subcommand is provided, render `MainMenu` component as root
- Route to appropriate components based on menu selection
- Handle navigation between components
- Menu primarily for viewing agents (list), launching done via CLI commands

**Deliverable**: Interactive menu-driven CLI for viewing agents. Launch functionality remains CLI-based. Make a PR.

**Note**: There is no interactive launch UI; launching agents happens via CLI commands (e.g., `launch --plan` or other subcommands).

---

## Phase 4: Polish & Error Handling

**Goal**: Improve error handling, add validation, and ensure robustness.

### Tasks

#### 5.1 Enhanced Error Handling
- Network errors: Show user-friendly message
- API errors: Display error message from API response
- Missing API key: Clear instruction to set `CURSOR_API_KEY`
- Git detection failures: Gracefully fall back to requiring manual input
- Rate limiting: Handle 429 responses with appropriate messaging
- File reading errors: Clear error messages for missing files or read errors

#### 5.2 Input Validation
- Validate repository URLs
- Validate ref/branch names
- Validate file paths
- Validate API key format (if applicable)
- Show validation errors in UI components

#### 5.3 Testing & Edge Cases
- Test with valid API key
- Test with missing API key
- Test repository detection in various Git configurations
- Test with different agent statuses
- Test error scenarios (network failures, invalid requests)
- Test quick launch mode with file input (`launch --plan plan.md`)
- Test file reading with various file paths (relative, absolute, missing files)
- Test markdown file reading (with and without frontmatter)

#### 5.4 Documentation & UX Improvements
- Ensure all keyboard shortcuts are documented in UI
- Improve error messages to be more actionable
- Add loading states and spinners where appropriate
- Verify color scheme and visual hierarchy
- Test responsive behavior with different terminal sizes

**Deliverable**: Polished CLI with robust error handling and validation. Make a PR.

## Phase 5: Reference & Future Considerations

This reference material captures the detailed specifications that the earlier phases implement and any future enhancements to revisit.

## API Endpoints Reference

Based on the [Cloud Agents API documentation](https://cursor.com/docs/cloud-agent/api/endpoints), we'll implement support for the following endpoints:

### 1. List Agents
- **Endpoint**: `GET /v0/agents`
- **Query Parameters**: `limit` (optional, default 20, max 100), `cursor` (optional)
- **Response**: List of agents with pagination cursor

### 2. Agent Status
- **Endpoint**: `GET /v0/agents/{id}`
- **Response**: Single agent details including status, source, target, summary

### 3. Launch Agent
- **Endpoint**: `POST /v0/agents`
- **Request Body**: prompt (text + optional images), source (repository + ref), target (optional), model (optional), webhook (optional)
- **Response**: Created agent with status "CREATING"

## TypeScript Schemas

### Core Types

```typescript
// Agent status types
type AgentStatus = "CREATING" | "RUNNING" | "FINISHED" | "FAILED" | "CANCELLED";

// Source configuration
interface AgentSource {
  repository: string; // GitHub repository URL
  ref?: string; // Branch, tag, or commit hash
}

// Target configuration
interface AgentTarget {
  branchName?: string;
  url: string; // URL to view agent in Cursor
  prUrl?: string; // GitHub PR URL if PR was created
  autoCreatePr?: boolean;
  openAsCursorGithubApp?: boolean;
  skipReviewerRequest?: boolean;
}

// Agent object
interface Agent {
  id: string; // e.g., "bc_abc123"
  name: string;
  status: AgentStatus;
  source: AgentSource;
  target: AgentTarget;
  summary?: string;
  createdAt: string; // ISO 8601 timestamp
}

// List agents response
interface ListAgentsResponse {
  agents: Agent[];
  nextCursor?: string;
}

// Prompt with optional images
interface Prompt {
  text: string;
  images?: Array<{
    data: string; // base64 encoded
    dimension: {
      width: number;
      height: number;
    };
  }>;
}

// Launch agent request
interface LaunchAgentRequest {
  prompt: Prompt;
  source: AgentSource;
  target?: {
    autoCreatePr?: boolean;
    openAsCursorGithubApp?: boolean;
    skipReviewerRequest?: boolean;
    branchName?: string;
  };
  model?: string;
  webhook?: {
    url: string;
    secret?: string; // minimum 32 characters
  };
}

// Conversation message types
type MessageType = "user_message" | "assistant_message";

interface ConversationMessage {
  id: string;
  type: MessageType;
  text: string;
}

interface AgentConversation {
  id: string;
  messages: ConversationMessage[];
}

// API key info
interface ApiKeyInfo {
  apiKeyName: string;
  createdAt: string;
  userEmail: string;
}

// Models response
interface ModelsResponse {
  models: string[];
}
```

## Implementation Steps

### 1. Create API Client Module

**File**: `src/api/client.ts`

- Create a typed API client class that handles:
  - Basic authentication using API key from environment variable (`CURSOR_API_KEY`)
  - Base URL: `https://api.cursor.com`
  - Request/response handling with proper error handling
  - All endpoint methods with proper TypeScript types

**Methods to implement**:
- `listAgents(limit?: number, cursor?: string): Promise<ListAgentsResponse>`
- `getAgentStatus(id: string): Promise<Agent>`
- `launchAgent(request: LaunchAgentRequest): Promise<Agent>`

### 2. Create Schema Definitions File

**File**: `src/api/schemas.ts`

- Export all TypeScript interfaces and types defined above
- Include validation helpers if needed (using zod or similar)
- Document each schema with JSDoc comments

### 3. Create Git Detection Utility

**File**: `src/utils/git.ts`

- Reuse and enhance the existing `detectGitHubRepo()` function from `cli.tsx`
- Extract `parseWorkingLocation()` function for reuse
- Create helper function `detectRepoAndRef(workingDir: string): Promise<{ repository: string; ref: string } | null>`
- Handle edge cases (SSH URLs, different Git config formats)

### 3.5. Create File Reading Utility

**File**: `src/utils/file.ts`

- Create function `readPlanFile(filePath: string): Promise<string>` to read prompt text from file
- Handle relative and absolute paths
- Support common markdown/text files (`.md`, `.txt`, etc.)
- Provide clear error messages for missing files or read errors
- Optionally strip frontmatter from markdown files if present

### 4. Create React Ink Components

**File**: `src/components/AgentList.tsx`

- Display list of agents in a table-like format using Ink's `Box` and `Text` components
- Show: ID, name, status (with color coding), repository, branch, and most importantly the `target.url`
- Handle pagination if `nextCursor` is present
- Allow keyboard navigation (arrow keys, enter to select)

**File**: `src/components/LaunchAgentForm.tsx`

- Interactive form using Ink's `useInput` hook
- Collect:
  - Prompt text (required, or read from file if `--plan` flag provided)
  - Repository (optional, auto-detect from working dir)
  - Ref/branch (optional, auto-detect from working dir)
  - Branch name for target (optional)
  - Auto-create PR option (optional)
  - Model selection (optional, with "Auto" option)
- Show detected repository/ref info if auto-detected
- Display validation errors
- On submit, call API and show the created agent's URL

**File**: `src/components/QuickLaunch.tsx`

- Non-interactive component for background agent launches
- Accepts a single plan file and launches agent immediately
- Shows minimal output: only the agent URL
- Exits quickly after launch (background mode)
- Designed for quick workflow integration

**File**: `src/components/MainMenu.tsx`

- Main menu component with options:
  - List agents
  - Launch new agent
  - Exit
- Use arrow keys for navigation, Enter to select

### 5. Refactor Main CLI Entry Point

**File**: `cloud-agent.tsx` (or keep as `cli.tsx` but binary name is `cloud-agent`)

- Replace current agent execution logic with menu-driven interface
- Initialize API client with environment variable check
- Show error if `CURSOR_API_KEY` is missing
- Render `MainMenu` component as root (unless in quick-launch mode)
- Handle command-line arguments:
  - **`launch` subcommand**: Launch a single agent
    - `cloud-agent launch --plan plan.md`: Launch single agent from plan file
    - Supports flags: `--repo`, `--ref`, `--branch`, `--auto-pr`, `--model`
  - **`list` subcommand**: Show agent list
    - `cloud-agent list`: Show interactive list of agents
  - **`status` subcommand**: Show agent status
    - `cloud-agent status <id>`: Show status of specific agent
  - `--repo <repo>`: override repository detection
  - `--ref <ref>`: override ref detection
  - `--dir <dir>`: specify working directory for detection
  - `--branch <name>`: target branch name
  - `--auto-pr`: enable auto-create PR
  - `--model <name>`: specify model (or "auto" for default)

**Main Workflow - Quick Launch Mode**:
- **Primary command**: `cloud-agent launch --plan plan.md`
- When `launch --plan` is provided, skip interactive menu entirely
- Auto-detect repo/ref from working directory (current git repo)
- Launch agent immediately in background
- **Output only the agent URL** (minimal output)
- Exit immediately after showing URL (non-blocking workflow)

### 6. Update Build Configuration

**File**: `build-cli.ts`

- Ensure all new source files are included in the build
- Update external dependencies if needed
- Verify output file permissions

### 7. Update Package Configuration

**File**: `package.json`

- Add any missing dependencies (e.g., `zod` for schema validation if desired)
- Update scripts if needed
- Ensure `bin` entry point is correct

## React Ink UI Design

### Design Principles

- **Clean and Minimal**: Focus on essential information, avoid clutter
- **Minimal Color Palette**: Use 3 shades of gray + 1 highlight color (cyan) for URLs and active states
- **Symbol-Based Status**: Use symbols (✓, ▶, ●, ✗, ○) rather than colors to indicate status
- **Keyboard-First**: Optimize for keyboard navigation (no mouse required)
- **Progressive Disclosure**: Show details when needed, hide when not
- **Clear Visual Hierarchy**: Important information (URLs) stands out with highlight color

### Color Scheme

**Minimal Palette**: 3 shades of gray + 1 highlight color

```typescript
const colors = {
  // Gray shades
  grayLight: "gray",      // Light gray for secondary text, borders
  gray: "gray",           // Medium gray for dimmed text, inactive items
  grayDark: "blackBright", // Dark gray for backgrounds, dividers
  
  // Single highlight color
  highlight: "cyan",      // For selected items, URLs, important info
  
  // Status differentiation (using gray shades + highlight)
  // Status shown through text weight/position rather than color
  // URLs always use highlight color
};
```

**Usage Guidelines**:
- **Highlight color (cyan)**: Selected items, URLs, active states, important actions
- **Light gray**: Secondary text, borders, hints
- **Medium gray**: Dimmed text, inactive menu items, auto-detected labels
- **Dark gray**: Backgrounds, dividers, separators
- **Status**: Differentiated by text position and symbols, not color

### Component Layouts

#### 1. Main Menu (`MainMenu.tsx`)

**Layout**:
```
┌─────────────────────────────────────┐
│  Cursor Cloud Agents                 │
│  ─────────────────────────────────   │
│                                      │
│  > List Agents                       │
│    Launch New Agent                  │
│    Exit                              │
│                                      │
│  Use ↑↓ to navigate, Enter to select│
└─────────────────────────────────────┘
```

**Features**:
- Centered menu with clear title
- Arrow indicator (`>`) shows selected option
- Highlight selected option with highlight color (cyan)
- Dim unselected options with medium gray
- Footer hint for keyboard controls in light gray
- Auto-exit on "Exit" or Ctrl+C

**Visual Example**:
```
Cursor Cloud Agents
───────────────────

  > List Agents          ← highlight color (cyan)
    Launch New Agent     ← medium gray
    Exit                 ← medium gray

Use ↑↓ to navigate, Enter to select  ← light gray
```

#### 2. Agent List (`AgentList.tsx`)

**Layout**:
```
┌────────────────────────────────────────────────────────────┐
│  Cloud Agents (20)                                         │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  ID          Name                    Status    Repository   │
│  ────────────────────────────────────────────────────────  │
│  bc_abc123   Add README Docs        FINISHED  org/repo     │
│              └─ https://cursor.com/agents?id=bc_abc123      │
│                                                             │
│  bc_def456   Fix auth bug           RUNNING   org/repo     │
│              └─ https://cursor.com/agents?id=bc_def456     │
│                                                             │
│  bc_ghi789   Refactor API           CREATING  org/repo     │
│              └─ https://cursor.com/agents?id=bc_ghi789     │
│                                                             │
│  Press 'q' to return, 'r' to refresh                       │
└────────────────────────────────────────────────────────────┘
```

**Features**:
- Table-like layout using Ink's `Box` with `flexDirection="row"`
- Status shown with symbols and text, not colors:
  - `CREATING`: `[●] CREATING` (medium gray)
  - `RUNNING`: `[▶] RUNNING` (medium gray)
  - `FINISHED`: `[✓] FINISHED` (medium gray)
  - `FAILED`: `[✗] FAILED` (medium gray)
  - `CANCELLED`: `[○] CANCELLED` (medium gray)
- Agent URL displayed prominently below each agent in highlight color (cyan)
- Truncate long names/repos with ellipsis
- Show loading spinner while fetching (medium gray)
- Empty state: "No agents found" (medium gray)
- Pagination indicator if `nextCursor` exists: "Press 'n' for next page" (light gray)

**Visual Example**:
```
Cloud Agents (3)
────────────────

ID          Name                Status         Repository
─────────────────────────────────────────────────────────
bc_abc123   Add README Docs     [✓] FINISHED   org/repo
            └─ https://cursor.com/agents?id=bc_abc123  ← highlight

bc_def456   Fix auth bug        [▶] RUNNING    org/repo
            └─ https://cursor.com/agents?id=bc_def456  ← highlight

bc_ghi789   Refactor API        [●] CREATING   org/repo
            └─ https://cursor.com/agents?id=bc_ghi789  ← highlight
```

#### 3. Launch Agent Form (`LaunchAgentForm.tsx`)

**Layout**:
```
┌────────────────────────────────────────────────────────────┐
│  Launch New Agent                                           │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  Prompt:                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Text input area - multi-line]                      │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Repository: https://github.com/org/repo (auto-detected)    │
│  Ref: main (auto-detected)                                  │
│                                                             │
│  Options:                                                   │
│  [ ] Auto-create PR                                         │
│  [ ] Open as Cursor GitHub App                              │
│                                                             │
│  Model: [Auto ▼]                                            │
│                                                             │
│  [Launch] [Cancel]                                          │
│                                                             │
│  Use Tab to navigate fields                                 │
└────────────────────────────────────────────────────────────┘
```

**Features**:
- Multi-line text input for prompt (use `useInput` with special handling)
- Show auto-detected repo/ref with `(auto-detected)` label in dim color
- Allow editing detected values
- Checkboxes for options (use `[x]` and `[ ]` characters)
- Dropdown for model selection (use `useInput` with arrow keys)
- Action buttons at bottom
- Real-time validation feedback
- Loading state during submission: "Launching agent..."

**Visual States**:
- **Editing Prompt**: Cursor visible, border in highlight color
- **Detected Values**: Shown in medium gray with `(auto-detected)` suffix
- **Validation Error**: Show error message in medium gray below field (with ✗ symbol)
- **Submitting**: Show spinner (medium gray) and "Launching..." message

#### 4. Quick Launch (`QuickLaunch.tsx`)

**Layout** (Minimal, Non-Interactive - MAIN WORKFLOW):
```
https://cursor.com/agents?id=bc_abc123
```

**Features**:
- **Ultra-minimal output**: Output ONLY the agent URL (primary use case)
- One URL on one line
- No extra text, no status messages, just the URL
- URL in highlight color (cyan) for easy copying
- Optionally copy URL to clipboard automatically
- Exit immediately after output (non-blocking)
- Error state: Show error message only if launch fails

**Visual Example** (Success):
```
https://cursor.com/agents?id=bc_abc123
```

**Visual Example** (Error):
```
Error: Failed to launch agent: Invalid repository
```

**Alternative Verbose Mode** (if `--verbose` flag):
```
Launching agent...
──────────────────

Repository: https://github.com/org/repo (auto-detected)
Ref: main (auto-detected)

✓ Agent launched successfully!

https://cursor.com/agents?id=bc_abc123
```

### Interactive Elements

#### Keyboard Navigation

**Main Menu**:
- `↑` / `↓`: Navigate options
- `Enter`: Select option
- `q` / `Esc`: Exit

**Agent List**:
- `↑` / `↓`: Navigate agents (if selecting)
- `q`: Return to menu
- `r`: Refresh list
- `n`: Next page (if pagination available)
- `Enter`: View agent details (future enhancement)

**Launch Form**:
- `Tab`: Move to next field
- `Shift+Tab`: Move to previous field
- `Enter`: Submit (when on submit button) or new line (in text area)
- `Esc`: Cancel and return to menu
- `Ctrl+C`: Exit application

**Quick Launch**:
- Output URL immediately
- Exit immediately (no waiting, non-blocking)
- No keyboard interaction needed (just outputs and exits)

### Status Indicators

**Agent Status Badges**:
- Use symbols with status name, all in medium gray
- Visual indicators:
  - `CREATING`: `[●] CREATING` (medium gray)
  - `RUNNING`: `[▶] RUNNING` (medium gray)
  - `FINISHED`: `[✓] FINISHED` (medium gray)
  - `FAILED`: `[✗] FAILED` (medium gray)
  - `CANCELLED`: `[○] CANCELLED` (medium gray)

**Loading States**:
- Use spinner: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` (rotating, medium gray)
- Or simple: `Loading...` with dots animation (medium gray)

**Success/Error Messages**:
- Success: Checkmark `✓` prefix (medium gray text)
- Error: Cross `✗` prefix (medium gray text)
- Warning: Warning `⚠` prefix (medium gray text)

### Typography

- **Headers**: Bold, default terminal color (white)
- **Labels**: Regular, default terminal color (white)
- **Values**: Regular, default terminal color (white)
- **Hints**: Light gray, smaller text
- **URLs**: Highlight color (cyan), maybe underline if supported
- **Status**: Medium gray with symbols
- **Selected/Active**: Highlight color (cyan)
- **Inactive/Dimmed**: Medium gray

### Spacing and Layout

- Use Ink's `Box` with `padding={1}` for containers
- `marginBottom={1}` between sections
- `flexDirection="column"` for vertical layouts
- `flexDirection="row"` for table rows
- Consistent border characters: `─` for horizontal (light gray), `│` for vertical (light gray)

### Responsive Considerations

- Handle terminal width gracefully
- Truncate long text with ellipsis
- Wrap URLs if needed (but prefer keeping on one line)
- Adjust table columns based on available width

### Accessibility

- High contrast between gray shades for readability
- Clear visual feedback through symbols and positioning (not just color)
- Keyboard shortcuts documented in UI (light gray)
- Error messages are descriptive and actionable
- Status differentiation through symbols, not color (colorblind-friendly)

## File Structure

```
/Users/jasonliu/Downloads/test-january/
├── cloud-agent.tsx            # Main entry point (refactored)
├── build-cli.ts               # Build script
├── package.json
├── plan.md                    # This file
└── src/
    ├── api/
    │   ├── client.ts          # API client implementation
    │   └── schemas.ts         # TypeScript schemas
    ├── components/
    │   ├── AgentList.tsx      # Agent list display
    │   ├── LaunchAgentForm.tsx # Agent creation form (interactive)
    │   ├── QuickLaunch.tsx    # Quick launch component (non-interactive)
    │   └── MainMenu.tsx       # Main menu component
    └── utils/
        ├── git.ts             # Git detection utilities
        └── file.ts            # File reading utilities
```

## User Experience Flow

### Interactive Mode (Default)

1. **Startup**: CLI checks for `CURSOR_API_KEY` environment variable
2. **Main Menu**: User sees menu with options to list agents or launch new agent
3. **List Agents**: 
   - Shows table of agents with status colors
   - Displays `target.url` prominently for each agent
   - User can press 'q' to return to menu
4. **Launch Agent**:
   - Prompts for task description
   - Auto-detects repository/ref from working directory
   - Shows detected values and allows override
   - Submits request and displays created agent URL
   - Returns to menu
5. **Error Handling**: Clear error messages for API failures, missing config, etc.

### Quick Launch Mode (Background Workflow) - MAIN WORKFLOW

**Use Case**: Developer working on code wants to quickly offload tasks without leaving their terminal.

1. **Main Workflow - Quick Launch with File**:
   ```bash
   cloud-agent launch --plan plan.md
   ```
   - Reads `plan.md` from current directory (or specified path)
   - Auto-detects repository and ref from git (current working directory)
   - Launches agent immediately in background
   - **Outputs ONLY the agent URL** and exits
   
   **Output**:
   ```
   https://cursor.com/agents?id=bc_abc123
   ```

2. **Quick Launch with Overrides**:
   ```bash
   cloud-agent launch --plan plan.md --repo https://github.com/org/repo --ref feature-branch
   ```
   - Override auto-detected values if needed
   - Still outputs only URL

**Output Format** (Default - Minimal):
```
https://cursor.com/agents?id=bc_abc123
```

**Output Format** (With `--verbose` flag):
```
Launching agent...
Repository: https://github.com/org/repo (auto-detected)
Ref: main (auto-detected)

✓ Agent launched successfully!

https://cursor.com/agents?id=bc_abc123
```

## Authentication

- Uses Basic Authentication with API key
- API key obtained from `CURSOR_API_KEY` environment variable
- Format: `-u YOUR_API_KEY:` (empty password in curl, handled in code)

## Error Handling

- Network errors: Show user-friendly message
- API errors: Display error message from API response
- Missing API key: Clear instruction to set `CURSOR_API_KEY`
- Git detection failures: Gracefully fall back to requiring manual input
- Rate limiting: Handle 429 responses with appropriate messaging

## Testing Considerations

- Test with valid API key
- Test with missing API key
- Test repository detection in various Git configurations
- Test with different agent statuses
- Test error scenarios (network failures, invalid requests)
- Test quick launch mode with file input (`launch --plan plan.md`)
- Test file reading with various file paths (relative, absolute, missing files)
- Test markdown file reading (with and without frontmatter)

## Example Usage Scenarios

### Scenario 1: Main Workflow - Quick Background Task
Developer notices some nits while working and wants to fix them:

```bash
# Create a plan.md file with the tasks
cat > plan.md << EOF
Fix the following issues:
- Remove unused imports
- Fix type errors
- Add missing error handling
EOF

# Launch agent in background (MAIN WORKFLOW)
cloud-agent launch --plan plan.md

# Output (minimal, just the URL):
https://cursor.com/agents?id=bc_xyz789
```

### Scenario 2: List Agents
```bash
cloud-agent list
# Shows interactive list of all agents
```

### Scenario 3: Check Agent Status
```bash
cloud-agent status bc_abc123
# Shows status of specific agent
```

### Scenario 4: Interactive Mode (Secondary)
```bash
cloud-agent
# Shows menu, user selects "Launch new agent"
# Interactive form collects details
```

## Future Enhancements (Not in Initial Scope)

- View agent conversation
- Model selection UI
- Webhook configuration
- Status polling for launched agents
- Watch mode: monitor agent status until completion

