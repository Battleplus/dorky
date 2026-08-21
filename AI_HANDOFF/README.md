# AI Execution Handoff — 10 OSS Tasks

This branch is a **planning-only shared handoff area** for delegated open-source implementation work. Do **not** merge `ai-handoff-plans` into `main`.

All task plans live here only so they can be shared by URL. Actual code must be implemented in the relevant project fork/feature branch shown below.

## Non-negotiable workflow

For every task:

1. Open the linked plan and upstream issue.
2. **Immediately re-check** that the issue is still open, unassigned, not human-claimed, and has no competing open/closed PR or already-landed equivalent fix.
3. Read that upstream repository's current contribution/agent instructions.
4. Create the implementation branch from the plan's stated **latest upstream base branch**, never from this planning branch.
5. Implement, test, commit, and push to the corresponding `Battleplus/*` fork.
6. **Do not open an upstream PR yet.**
7. Return: branch URL, commit SHA/URL, compare/diff, changed files, exact test results, and clean `git status`.
8. A second review will inspect the actual GitHub diff and re-check for duplicate work before any upstream PR is created.

If another contributor claims or implements the issue while you are working, stop and report it rather than racing them.

---

## Tier A — execute first

These have the clearest scope and best current execution/review path.

### 1. dorky #60 — `--status`

Pure local state feature; no cloud credentials required.

- Issue: https://github.com/trishantpahwa/dorky/issues/60
- Fork: `Battleplus/dorky`
- Base: `trishantpahwa/dorky:main`
- Branch: `feat/status-command`
- Plan: [issue-60-status.md](./issue-60-status.md)

### 2. dorky #58 — bounded remote concurrency + Drive folder cache

Bound per-file remote concurrency and remove repeated Drive folder lookups.

- Issue: https://github.com/trishantpahwa/dorky/issues/58
- Fork: `Battleplus/dorky`
- Base: `trishantpahwa/dorky:main`
- Branch: `perf/remote-concurrency`
- Plan: [issue-58-concurrency.md](./issue-58-concurrency.md)

### 3. dorky #61 — `--list remote --update`

Rebuild local `uploaded-files` metadata from current S3/Drive live state.

- Issue: https://github.com/trishantpahwa/dorky/issues/61
- Fork: `Battleplus/dorky`
- Base: `trishantpahwa/dorky:main`
- Branch: `feat/list-remote-update`
- Plan: [issue-61-metadata-rebuild.md](./issue-61-metadata-rebuild.md)

### 4. Refined GitHub #9909 — `clean-repo-sidebar` broken

Small current-GitHub DOM/selector regression in one feature.

- Issue: https://github.com/refined-github/refined-github/issues/9909
- Fork: `Battleplus/refined-github`
- Base: `refined-github/refined-github:main`
- Branch: `fix/clean-repo-sidebar-about`
- Plan: [refined-github-9909-clean-repo-sidebar.md](./refined-github-9909-clean-repo-sidebar.md)

### 5. Refined GitHub #9987 — mark locked issues in lists

Contained list-page feature modeled on existing `mark-pinned` / `locked-issue` behavior.

- Issue: https://github.com/refined-github/refined-github/issues/9987
- Fork: `Battleplus/refined-github`
- Base: `refined-github/refined-github:main`
- Branch: `feat/mark-locked-in-lists`
- Plan: [refined-github-9987-mark-locked.md](./refined-github-9987-mark-locked.md)

### 6. Refined GitHub #9988 — place `closing-remarks` below merged event

Small timeline placement fix with an existing feature and test URLs.

- Issue: https://github.com/refined-github/refined-github/issues/9988
- Fork: `Battleplus/refined-github`
- Base: `refined-github/refined-github:main`
- Branch: `fix/closing-remarks-position`
- Plan: [refined-github-9988-closing-remarks-position.md](./refined-github-9988-closing-remarks-position.md)

---

## Tier B — advanced / reserve

These are useful candidates but require more domain-specific validation, environment support, or maintainer design agreement. Do **not** treat them as blind one-shot coding tasks.

### 7. PufferLib #620 — self-play swaps opponents mid-game

Native `5c` self-play correctness: checkpoint swaps must reset affected environments and recurrent state. CUDA/native validation required.

- Issue: https://github.com/PufferAI/PufferLib/issues/620
- Fork: `Battleplus/PufferLib`
- Base: `PufferAI/PufferLib:5c` (**not** default `4.0`)
- Branch: `fix/5c-selfplay-swap-reset`
- Plan: [pufferlib-620-selfplay-swap.md](./pufferlib-620-selfplay-swap.md)

### 8. Refined GitHub #9247 — autofocus confirmation dialogs

Accessibility/keyboard UX feature. Must first re-test current GitHub dialogs and respect any native focus already present.

- Issue: https://github.com/refined-github/refined-github/issues/9247
- Fork: `Battleplus/refined-github`
- Base: `refined-github/refined-github:main`
- Branch: `feat/modal-autofocus`
- Plan: [refined-github-9247-modal-autofocus.md](./refined-github-9247-modal-autofocus.md)

### 9. dorky #62 — AES-256-GCM encryption at rest

Advanced crypto feature. **Maintainer design agreement is required before implementation.**

- Issue: https://github.com/trishantpahwa/dorky/issues/62
- Fork: `Battleplus/dorky`
- Base: `trishantpahwa/dorky:main`
- Proposed branch after approval: `feat/encryption-at-rest`
- Plan: [issue-62-encryption.md](./issue-62-encryption.md)

### 10. dorky #63 — finish cross-provider `--migrate`

Advanced migration/rollback task. **Maintainer agreement on resume/rollback semantics is required before implementation.**

- Issue: https://github.com/trishantpahwa/dorky/issues/63
- Fork: `Battleplus/dorky`
- Base: `trishantpahwa/dorky:main`
- Proposed branch after approval: `feat/finish-migrate`
- Plan: [issue-63-migrate.md](./issue-63-migrate.md)

---

## Candidates intentionally rejected during screening

Do not resurrect these without re-checking; they were excluded because someone already implemented/claimed them, a PR already exists, or the issue specifically rejects AI work. Examples include Open WebUI #28665/#28663/#28661/#28749/#28683/#28656/#28777/#28643, Crawlee Python #2020, dorky #50/#57/#59/#64, and Refined GitHub #9935.

The purpose of this list is to reduce duplicate OSS work, not to maximize issue count.

## Review gate

The implementation AI must stop after pushing its task branch to the correct `Battleplus/*` fork. It must **not** create the upstream pull request. The review step will inspect the actual remote diff, re-run duplicate-PR/claim checks, verify tests and acceptance criteria, and only then decide whether an upstream PR should be opened.
