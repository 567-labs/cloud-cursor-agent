# Contributing Guide (Docs Edition)

This addendum complements `CONTRIBUTING.md` by focusing on documentation, UX polish, and CLI examples. Follow it when adding guides, troubleshooting tips, or user-facing text.

## Writing Guidelines

- Aim for a clear, ninth-grade reading level.
- Prefer short paragraphs and bulleted lists.
- Use inline code formatting for commands (`cloud-agent watch bc_123`) and flags (`--non-interactive`).
- Include before/after context or expected output when it helps readers run a command with confidence.

## Keeping Examples Up to Date

1. Add new commands or flags to `docs/EXAMPLES.md`.
2. Update `README.md` and `AGENTS.md` summaries if the UX changes.
3. Link to detailed docs from the README when the content grows beyond a few paragraphs.

## Testing Documentation Changes

- Use real commands when possible. Run them locally with `bun run cloud-agent.tsx ...` to confirm the output.
- For screenshots or gifs (if added later), keep them under `docs/assets/`.
- Mention how to reproduce the scenario you documented in the pull request body.

## Pull Request Checklist

- [ ] `bun test` passes locally (or targeted tests for the affected area).
- [ ] `bun run format` keeps markdown/table formatting consistent.
- [ ] New docs reference related guides (API, troubleshooting, examples).
- [ ] Added sections include at least one inline or fenced code example.
- [ ] Screens any new links for correctness (prefer relative paths like `docs/TROUBLESHOOTING.md`).

## Suggesting Larger Changes

For multi-phase documentation work:

1. File or link to a plan that explains the motivation.
2. Break changes into phases if they touch the same file repeatedly (for example, “Phase 1: reorganize README”, “Phase 2: add diagrams”).
3. Land phases sequentially to avoid merge conflicts in long-form markdown.

## Need Help?

Open a GitHub discussion or tag a maintainer in your pull request. Include:

- The command/output you observed (`cloud-agent watch ... --verbose`).
- Steps you tried to resolve the problem.
- Links to any docs you think should be updated.
