# Refined GitHub #9988 — place `closing-remarks` below merged-PR box

Status: **priority / small placement fix**

- Upstream issue: https://github.com/refined-github/refined-github/issues/9988
- User fork: https://github.com/Battleplus/refined-github
- Upstream branch: `main`
- Suggested branch: `fix/closing-remarks-position`
- Verified 2026-08-21: open, unassigned, no comments, and no matching implementation PR found after inspecting search results.

## Goal

On merged PR conversations, Refined GitHub's `closing-remarks` block should appear in a more natural chronology: after GitHub's native “merged” timeline box instead of directly after the entire `.js-discussion` container.

Current `source/features/closing-remarks.tsx` does this:

```ts
function mountClosingRemarks(props, signal) {
    const container = <div />;
    mount(ClosingRemarks, {target: container, props});
    observe('.js-discussion', anchor => {
        anchor.after(container);
    }, {signal});
}
```

The issue's example URL is https://github.com/refined-github/refined-github/pull/8809.

## Stop conditions

Before coding:

1. Confirm #9988 is still open/unassigned and nobody has claimed it.
2. Search all open/closed PRs for #9988 and `closing-remarks` placement.
3. Reproduce on the current GitHub merged-PR DOM. If GitHub or latest Refined GitHub already places the block after the merge event, stop as stale.
4. Respect any issue-specific contribution policy added after this plan was written.

## Git setup

```bash
git clone https://github.com/Battleplus/refined-github.git
cd refined-github
git remote add upstream https://github.com/refined-github/refined-github.git
git fetch upstream
git switch -c fix/closing-remarks-position upstream/main
npm install
```

## Implementation approach

Do not use arbitrary child indexes. Identify the current native merged timeline item using a selector already used by the feature where possible. `getMergeCommitHash()` currently finds:

```ts
.TimelineItem.js-details-container.Details a[href^="/<repo>/commit/"]
```

Prefer deriving an insertion anchor from the native merge timeline item containing that link, then insert the closing-remarks container immediately after that item.

Requirements:

- already-merged PR load: remarks appear after the native merged event;
- PR merged while page is open: post-merge remarks appear in the same logical position;
- tagged/untagged variants keep working;
- locked/archived test URLs in the existing source comments keep working;
- React navigation must not duplicate the block;
- if the expected merge anchor cannot be found, fail safely rather than inserting at a clearly wrong location.

Keep the placement helper small. Do not redesign `ClosingRemarks.svelte` or the header tag behavior.

## Testing

Use existing test URLs documented at the bottom of `closing-remarks.tsx`, especially:

- merged PR;
- locked PR;
- archived repo PR;
- tagged and untagged PRs;
- merge-a-PR-live path if you have a sandbox with permissions.

Run:

```bash
npm test
npm run format:check
npm run lint
npm run build
```

Manual validation should record before/after DOM position or screenshot evidence.

## Scope control

Do not combine #9989 visual icon styling into this task. This issue is only about vertical placement/order. Do not touch unrelated timeline features.

## Delivery

Suggested commit:

```text
fix: place closing remarks after merge event
```

Push only to `Battleplus/refined-github:fix/closing-remarks-position`. **Do not open an upstream PR.** Return branch URL, commit SHA, compare/diff, changed files, tests, manual validation, and clean `git status`.
