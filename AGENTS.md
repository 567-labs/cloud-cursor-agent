# Cloud Agents Documentation

AI-powered assistants that work on GitHub repositories. They read code, make changes, create branches, and open pull requests.

## Quick Start

```bash
export CURSOR_API_KEY=your_api_key  # Get from https://cursor.com/settings
cloud-agent launch --plan plan/bug-fixes/type-errors.md
# Output: https://cursor.com/agents?id=bc_abc123
```

## Launch Command

```bash
cloud-agent launch --plan <file>
```

Creates PR automatically. Plan files should be organized in `plan/{feature}/{plan}.md` structure:

- `plan/bug-fixes/type-errors.md`
- `plan/bug-fixes/add-error-handling.md`

## When to Launch Tasks

Tasks should only be kicked off if they are very parallelizable and do not have any dependencies.

## Troubleshooting

**API Key Not Set:** `export CURSOR_API_KEY=your_key` ([get key](https://cursor.com/settings)). If API key is not found, try `source ~/.zshrc`

**Plan File Not Found:** Check path, use absolute path if needed, verify read permissions

**Git Not Detected:** Ensure in git repo with `origin` remote

**Authentication Failed:** Verify API key is correct and not expired
