/**
 * Agents MD command - Print the AGENTS.md template content
 */

import type { CommandContext } from "../cli/types.js";

const AGENTS_MD_TEMPLATE = `# Cloud Agents

Launch parallel AI agents to work on GitHub repos. Each agent creates a branch and opens a PR. **You review and merge the PRs yourself.**

## Quick Start

\`\`\`bash
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings

cloud-agent launch --plan plan/feature-auth.md
# Output: https://cursor.com/agents?id=bc_abc123
\`\`\`

## Plan Structure

Organize plans in a \`plan/\` directory. Each plan should be a focused, single-purpose task.

### Directory Structure

\`\`\`
plan/
  ├── feature-auth.md
  ├── fix-login-error.md
  ├── refactor-api-client.md
  └── add-user-profile.md
\`\`\`

### Plan File Format

A good plan should include:

1. **Title** - Clear, descriptive title
2. **Goal** - What you're trying to accomplish
3. **Tasks** - Specific, actionable steps
4. **Files** - List of files to create, modify, or delete
5. **Expected Outcome** - What success looks like

### Example Plan: \`plan/feature-auth.md\`

\`\`\`markdown
# Add User Authentication

## Goal
Add login/logout functionality with session management.

## Tasks
- Create \`src/auth/login.tsx\` component (new file)
- Create \`src/auth/logout.tsx\` component (new file)
- Create \`src/auth/session.ts\` for session management (new file)
- Update \`src/routes.tsx\` to add auth middleware
- Update \`src/components/Header.tsx\` to add login/logout buttons

## Files Changed
- New: \`src/auth/login.tsx\`
- New: \`src/auth/logout.tsx\`
- New: \`src/auth/session.ts\`
- Modified: \`src/routes.tsx\`
- Modified: \`src/components/Header.tsx\`

## Expected Outcome
- Users can log in and log out
- Protected routes redirect to login if not authenticated
- Session persists across page refreshes
\`\`\`

### Example Plan: \`plan/fix-login-error.md\`

\`\`\`markdown
# Fix Login Error Message

## Goal
Update error message text in login handler to be more user-friendly.

## Tasks
- Change error text in \`src/auth/login.ts\` from "Invalid credentials" to "Email or password is incorrect"

## Files Changed
- Modified: \`src/auth/login.ts\`

## Expected Outcome
Users see a clearer error message when login fails.
\`\`\`

## Heredoc Syntax

For quick, one-off plans, use heredoc syntax:

\`\`\`bash
cloud-agent launch --plan - <<'EOF'
fix: update error message in login handler

- Change error text in src/auth/login.ts
EOF
\`\`\`

## Critical Rule: Parallelization

**Only launch tasks that modify completely different files.** If two plans touch the same file (even different parts), run them sequentially, not in parallel.

**Parallel OK:**
- Plan A edits \`utils.ts\`, Plan B edits \`api.ts\`
- Plan A creates \`feature-auth.ts\`, Plan B creates \`feature-profile.ts\`

**NOT OK:**
- Plan A and B both edit \`app.ts\`
- Plan A edits \`utils.ts\` and Plan B also edits \`utils.ts\`
- Plan B depends on changes from Plan A

### Same-File Refactorings

Use a phased approach:

\`\`\`bash
# Phase 1
cloud-agent launch --plan plan/refactor-phase1.md
AGENT_ID=$(cloud-agent launch --plan plan/refactor-phase1.md | grep -o 'bc_[a-z0-9]*')
cloud-agent watch $AGENT_ID

# Phase 2 (after Phase 1 completes)
cloud-agent launch --plan plan/refactor-phase2.md
\`\`\`

## Model Selection

Auto-selected based on plan complexity. Override with \`--model\`:

- \`composer-1\` (fast) - Simple tasks: bug fixes, typos, small changes
- \`claude-4.5-opus-high\` (smart) - Complex tasks: refactors, architecture changes, new features

## Useful Commands

\`\`\`bash
# Watch agent until completion
cloud-agent watch $AGENT_ID --verbose

# View agent conversation
cloud-agent conversation $AGENT_ID

# Add follow-up instructions
cloud-agent followup $AGENT_ID --messages "Add tests"

# Open agent in browser
cloud-agent open $AGENT_ID

# Open PR in browser
cloud-agent open $AGENT_ID --pr

# List all agents
cloud-agent list --non-interactive

# Check agent status
cloud-agent status $AGENT_ID --non-interactive
\`\`\`

## Best Practices

1. **One plan per file** - Keep plans focused and single-purpose
2. **Name plans descriptively** - Use clear names like \`feature-auth.md\`, \`fix-login-bug.md\`
3. **List all files** - Be explicit about which files will be created or modified
4. **Test sequentially** - If plans touch the same files, run them one at a time
5. **Review PRs** - Always review and test PRs before merging
\`\`\`
`;

export async function executeAgentsMd(_context: CommandContext): Promise<void> {
  console.log(AGENTS_MD_TEMPLATE);
}
