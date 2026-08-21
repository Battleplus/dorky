# Refined GitHub #9909 — `clean-repo-sidebar` broken

Status: **priority / small UI fix**

- Upstream issue: https://github.com/refined-github/refined-github/issues/9909
- User fork: https://github.com/Battleplus/refined-github
- Upstream branch: `main`
- Suggested branch: `fix/clean-repo-sidebar-about`
- Verified 2026-08-21: open, unassigned, no matching implementation PR found; only maintainer comment says the breakage is likely caused by GitHub layout changes.

## Problem

The `clean-repo-sidebar` feature is supposed to hide the repository sidebar's **About** header, but on current GitHub the header is visible and the feature throws an `ElementNotFoundError` while trying to locate an older sidebar structure.

Current CSS still assumes the classic structure:

```css
[rgh-clean-repo-sidebar] [class*='PageLayout-Pane'] {
    .BorderGrid-row:first-child h2 {
        display: none;
    }
}
```

The issue's repro URL is `https://github.com/react/react`.

## Stop conditions

Before coding:

1. Confirm #9909 is still open/unassigned and nobody has claimed it.
2. Search all open/closed PRs for #9909 and `clean-repo-sidebar`.
3. Test the current GitHub DOM on the issue's repro URL with the extension enabled.
4. If GitHub has changed again and the feature already works on latest `main`, stop and report the issue as stale.
5. Respect any current repository contribution/AI policy. If maintainers add an explicit “AI PRs not welcome” comment to this issue, stop.

## Git setup

```bash
git clone https://github.com/Battleplus/refined-github.git
cd refined-github
git remote add upstream https://github.com/refined-github/refined-github.git
git fetch upstream
git switch -c fix/clean-repo-sidebar-about upstream/main
npm install
```

Refined GitHub currently requires Node >=24 and npm 12.

## Investigation

Use browser DevTools on a current repository page and compare the actual sidebar DOM with:

- `source/features/clean-repo-sidebar.css`
- the feature's TS/TSX file if it has JS-side selectors or activation logic;
- the `ElementNotFoundError` stack shown by the issue.

Find a selector anchored to stable semantics rather than generated class names whenever possible. Prefer existing `data-*`, headings/landmarks, stable Primer structure, or an existing project helper over brittle hashed CSS-module names.

## Implementation goal

Make the feature again hide the About heading/content elements it intentionally cleans while leaving unrelated repository sidebar sections intact. The fix should be narrowly scoped to current GitHub repository pages.

Expected behavior:

- no `ElementNotFoundError` on `https://github.com/react/react`;
- About header is hidden as intended;
- Packages/release/contributor/code-of-conduct cleanup rules still work;
- repository pages without some optional sidebar sections do not throw;
- no global selectors that affect unrelated GitHub pages.

## Tests / validation

At minimum run:

```bash
npm test
npm run format:check
npm run lint
npm run build
```

Also perform manual extension validation on:

1. a large public repo with About, releases, packages/contributors;
2. a repo with a minimal sidebar;
3. the issue repro URL.

If the project has feature fixtures/snapshots for `clean-repo-sidebar`, update only the relevant ones. Do not regenerate unrelated snapshots.

## Scope control

- Do not redesign the feature.
- Do not fix unrelated GitHub layout regressions in the same PR.
- Do not replace stable selectors elsewhere just because you notice them.
- Do not reformat unrelated feature files.

## Delivery

Suggested commit:

```text
fix: update clean repo sidebar selectors
```

Push only to `Battleplus/refined-github:fix/clean-repo-sidebar-about`. **Do not open an upstream PR.** Return branch URL, commit SHA, compare/diff against upstream/main, changed files, test output, manual repro notes/screenshots if available, and clean `git status`.
