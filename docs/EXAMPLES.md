# Command Examples

This guide shows common `cloud-agent` CLI invocations. Copy, paste, and tweak the commands to fit your workflow. Use `--non-interactive` whenever you run commands inside scripts, CI, or AI agents.

## Launch

```bash
cloud-agent launch --plan plan/refactors/agent-list.md \
  --repo https://github.com/jxnl/cloud-cursor-agent \
  --branch docs-refresh
```

Use `--plan -` to stream plan text via stdin:

```bash
cloud-agent launch --plan - <<'EOF'
improve(docs): document troubleshooting tips

- add troubleshooting section
- link to new docs
EOF
```

## List Agents

```bash
cloud-agent list --non-interactive
cloud-agent list --non-interactive --search "docs"
```

## Agent Status

```bash
cloud-agent status bc_abc123 --non-interactive
```

## Watch

```bash
# Wait until the agent finishes, checking every 5 seconds
cloud-agent watch bc_abc123 --interval 5000 --verbose
```

## Follow-up Instructions

```bash
cloud-agent followup bc_abc123 "Please add unit tests for cancel command"
cloud-agent followup bc_abc123 @followup.md
```

## Conversation History

```bash
cloud-agent conversation bc_abc123 --non-interactive > convo.txt
```

## Open Agent Dashboard or PR

```bash
cloud-agent open bc_abc123
cloud-agent open bc_abc123 --pr
```

## Delete or Cancel Agents

```bash
cloud-agent delete bc_abc123
cloud-agent cancel bc_abc123
```

## Batch Delete

```bash
# Preview and delete finished agents
cloud-agent batch-delete --status FINISHED --dry-run
cloud-agent batch-delete --status FINISHED --force

# Delete all terminal agents for the current repo
cloud-agent batch-delete --status terminal --force --repo https://github.com/jxnl/cloud-cursor-agent
```

## API Key Info

```bash
cloud-agent me
```

## Model Listing

```bash
cloud-agent list-models
cloud-agent list-models --non-interactive
```

## Generate AGENTS.md Instructions

```bash
cloud-agent install-agents-md --file AGENTS.md --force
cloud-agent install-agents-md --file docs/CLI.md --dir /path/to/repo
```

## Interactive Menu

```bash
cloud-agent
```

Navigate with `↑` / `↓` or `j` / `k`, press `Enter` to confirm, and hit `q` to exit.
