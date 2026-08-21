# AI Execution Handoff

This branch is a planning-only handoff area for delegated implementation work. Do **not** merge this branch into `main`.

## Workflow

1. Pick one task below.
2. Before coding, re-check the upstream issue is still open, unassigned, and has no competing open/closed PR.
3. Create the task branch from the latest `trishantpahwa/dorky:main`, not from this planning branch.
4. Implement, test, commit, and push the task branch to `Battleplus/dorky`.
5. **Do not open an upstream PR yet.** Return the branch URL, commit SHA/URL, diff/compare, changed files, tests, and `git status` to the user for review.

## Tasks

### 1. Issue #60 — `--status`

Recommended first. Purely local, no cloud credentials required.

- Upstream issue: https://github.com/trishantpahwa/dorky/issues/60
- Plan: [issue-60-status.md](./issue-60-status.md)
- Suggested branch: `feat/status-command`

### 2. Issue #58 — bounded remote concurrency + Drive folder cache

Performance/correctness work across CLI and MCP.

- Upstream issue: https://github.com/trishantpahwa/dorky/issues/58
- Plan: [issue-58-concurrency.md](./issue-58-concurrency.md)
- Suggested branch: `perf/remote-concurrency`

### 3. Issue #61 — `--list remote --update`

Rebuild local metadata from remote S3 / Google Drive state.

- Upstream issue: https://github.com/trishantpahwa/dorky/issues/61
- Plan: [issue-61-metadata-rebuild.md](./issue-61-metadata-rebuild.md)
- Suggested branch: `feat/list-remote-update`

## Non-negotiable review gate

The implementation AI must stop after pushing its task branch to `Battleplus/dorky`. It must **not** create the upstream pull request. A second review will inspect the actual GitHub diff, rerun the issue/PR duplication check, and verify acceptance criteria before any upstream PR is opened.
