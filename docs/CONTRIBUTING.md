# Contributing Guide

Thanks for helping improve the Cloud Agents CLI. This guide covers local setup, coding standards, and the checklist we follow before merging contributions.

## Prerequisites

- [Bun](https://bun.sh) `1.1+`
- Node.js `18+` (only for tooling compatibility)
- Git
- Cursor API key (needed to exercise real commands)

## Local Setup

```bash
git clone https://github.com/<org>/cloud-agent.git
cd cloud-agent
bun install
```

- Use `bun run dev` for the interactive Ink UI.
- Run `bun run build` to generate `cli.js`.
- Verify the artifact with `bun run verify`.

## Branching & Workflow

1. Create a feature branch: `git checkout -b feat/<topic>`.
2. Make focused commits with clear messages (imperative mood).
3. Keep PRs scoped: documentation-only changes should avoid touching runtime code unless necessary.
4. Reference any related issues or plans in the PR description.

## Coding Standards

- TypeScript/TSX files should stay in `src/`.
- Favor async/await patterns, matching the existing `CloudAgentsApiClient`.
- Keep CLI interactions non-blocking unless the command explicitly watches for completion.
- Prefer descriptive variable names over terse abbreviations.
- Match the documentation style you see in `README.md` and `AGENTS.md` (9th-grade reading level, short sentences).

## Documentation

- Update `README.md` and `docs/` when you add flags, commands, or workflow changes.
- When you introduce a new command, include at least one snippet in `docs/EXAMPLES.md`.
- For agent-behavior changes, also revise `AGENTS.md` so automation best practices stay accurate.

## Testing & Verification

- `bun run build` – catches TypeScript compilation issues.
- `bun run dev` – smoke test the interactive UI locally.
- `bun run verify` – ensures the CLI bundle exists and is executable.
- Add unit tests if you extract helpers; colocate them near the implementation (e.g., `src/utils/__tests__`).

## Pull Request Checklist

- [ ] Code builds (`bun run build`)
- [ ] CLI bundle verified (`bun run verify`)
- [ ] Documentation updated (README, `docs/*`, `AGENTS.md` where applicable)
- [ ] Screenshots or terminal recordings attached for UX-facing changes
- [ ] Added notes about model selection or API limits if relevant
- [ ] Linked issues or plans referenced in the description

## Getting Help

- File issues describing the bug, expected behavior, and reproduction steps.
- Join the discussion in the Cursor community forums for workflow questions.
- For urgent blocking problems, follow the escalation path in `docs/TROUBLESHOOTING.md`.
