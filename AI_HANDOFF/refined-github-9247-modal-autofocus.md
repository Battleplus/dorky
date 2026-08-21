# Refined GitHub #9247 — autofocus confirmation dialogs

Status: **reserve / accessibility UX**

- Upstream issue: https://github.com/refined-github/refined-github/issues/9247
- User fork: https://github.com/Battleplus/refined-github
- Upstream branch: `main`
- Suggested branch: `feat/modal-autofocus`
- Verified 2026-08-21: issue is open/unassigned; no matching implementation PR was found after inspecting search results. Maintainer comments add several repro examples but no one claims the task.

## Goal

GitHub has custom confirmation dialogs whose actionable buttons do not receive useful initial focus, so keyboard users cannot simply press Enter/Space (or a predictable Tab+Enter sequence). The proposed refinement is analogous to Refined GitHub's accessibility/UX features such as `no-modals` and `same-page-links`.

The issue proposes a `modal-autofocus` feature: detect relevant dialog openings and focus the appropriate confirmation/control button.

## Stop conditions

Before coding:

1. Confirm #9247 is still open/unassigned and no one has claimed it.
2. Search all open/closed PRs for #9247 / `modal-autofocus`.
3. Re-test the issue's current example flows; GitHub frequently changes dialogs.
4. If native GitHub now focuses a sensible control in all listed repros, stop as stale.
5. If maintainers add an AI/new-contributor restriction to this issue, stop.

## Git setup

```bash
git clone https://github.com/Battleplus/refined-github.git
cd refined-github
git remote add upstream https://github.com/refined-github/refined-github.git
git fetch upstream
git switch -c feat/modal-autofocus upstream/main
npm install
```

## Investigation

Collect the current DOM for at least three dialog families referenced by the issue/comments, including the original “Convert to draft” example. Determine whether they share:

- `<dialog>` / Primer dialog semantics;
- stable role/aria attributes;
- a common confirmation-button marker;
- a MutationObserver-compatible insertion/open signal.

Search existing helpers/features before inventing a new global observer:

```bash
rg "dialog|modal|autofocus|focus\(" source
```

## Design requirements

A good implementation should:

- focus only dialogs where GitHub failed to establish useful focus;
- not steal focus from dialogs that already deliberately focus an input/button;
- select the safe/intended initial action consistently. Do **not** assume the destructive/primary button is always the correct first focus;
- work after React navigation and repeated dialog openings without duplicate observers/listeners;
- preserve Escape behavior and focus restoration when the dialog closes;
- not synthesize clicks or auto-confirm anything.

The issue comments note at least one dialog where GitHub already focuses “Keep editing”; treat this as evidence that existing native focus should normally be respected. A conservative rule is preferable: only intervene when focus remains outside the newly opened dialog or on a non-actionable container.

## Implementation shape

Prefer a contained feature using existing observer/event helpers. If multiple dialog implementations exist, add a small function that:

1. receives a newly opened dialog;
2. checks whether `document.activeElement` is already a meaningful descendant;
3. finds the intended focusable action using stable semantics;
4. calls `.focus()` once.

Do not install polling timers or broad document key handlers.

## Tests / manual validation

Validate keyboard-only behavior:

- open dialog → intended control visibly receives focus;
- Enter/Space acts only on that focused control;
- Escape still closes when native dialog supports it;
- closing returns focus appropriately;
- dialogs with an existing meaningful autofocus are not overridden;
- repeated openings and React navigation do not duplicate behavior.

Run:

```bash
npm test
npm run format:check
npm run lint
npm run build
```

If the project has DOM/Vitest patterns suitable for this feature, add focused tests for “no focus inside → focus fallback” and “native focus already inside → leave unchanged”.

## Scope control

Do not redesign GitHub dialogs, alter button order, auto-submit forms, or add a global keyboard shortcut. Do not combine unrelated modal fixes.

## Delivery

Suggested commit:

```text
feat: autofocus confirmation dialogs
```

Push only to `Battleplus/refined-github:feat/modal-autofocus`. **Do not open an upstream PR.** Return branch URL, commit SHA, compare/diff, changed files, tests, manual keyboard validation, and clean `git status`.
