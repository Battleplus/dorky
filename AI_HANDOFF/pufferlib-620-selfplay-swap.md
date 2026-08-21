# PufferLib #620 — self-play opponent swaps mid-game

Status: **priority / advanced CUDA correctness**

- Upstream issue: https://github.com/PufferAI/PufferLib/issues/620
- User fork: https://github.com/Battleplus/PufferLib
- Target upstream branch: `5c`
- Suggested fork branch: `fix/5c-selfplay-swap-reset`
- Verified 2026-08-21: issue is open, unassigned, has no comments, and no matching open/closed PR was found.

## Problem

In native `5c` self-play, `boundary_reached` is sticky while individual environments can finish, reset, and continue. When the final environment reaches the scheduling boundary, other environments may already be partway through a new episode. The scheduler then swaps opponent checkpoint weights without resetting those active episodes or recurrent state. A single trajectory can therefore begin against one opponent checkpoint and finish against another, corrupting self-play trajectories and win-rate/evaluation statistics.

The issue explicitly expects environment state **and RNN state** to be reset when opponent weights are swapped.

## Stop conditions before coding

Re-check all of the following immediately before starting:

1. #620 is still open and unassigned.
2. No human comment claims the issue.
3. Search all PufferLib PRs, open and closed, for `#620` / the title / the relevant scheduler code.
4. Confirm the bug still exists on the latest upstream `5c` branch. Do not implement from `4.0` or the fork default branch.
5. If the current `5c` code already resets every affected environment and recurrent state at swap time, stop and report that the issue is stale.

## Git setup

```bash
git clone https://github.com/Battleplus/PufferLib.git
cd PufferLib
git remote add upstream https://github.com/PufferAI/PufferLib.git
git fetch upstream
git switch -c fix/5c-selfplay-swap-reset upstream/5c
```

## Investigation first

Do not patch the linked old line number blindly. Locate the current self-play checkpoint-swap path by searching for:

```bash
rg "boundary_reached|self.?play|frozen|checkpoint|opponent|rnn|hidden|reset" src
```

Map these pieces before editing:

- where `boundary_reached` is set and cleared;
- where environment terminal/reset is performed for CPU and GPU environments;
- how physical environments map to agents/policies;
- where opponent/frozen-bank weights are loaded/swapped;
- where recurrent/MinGRU hidden state used by rollout inference lives;
- whether there is already a reusable batch reset/helper or CUDA kernel.

## Required invariant

A checkpoint swap must define a clean episode boundary. After new opponent weights become active, no environment may continue an episode that began under the previous opponent weights, and no RNN hidden state from the previous episode/opponent may survive.

The safest implementation is:

1. Wait until the existing scheduler condition says the bank/opponent swap should happen.
2. Before exposing the new opponent weights to rollout, reset all environments affected by that swap, not just the environment that reached the final boundary.
3. Clear/reinitialize their recurrent hidden state using the same semantics as a normal episode reset.
4. Reset any per-environment sticky boundary/accounting state that otherwise belongs to the previous scheduling window.
5. Then load/publish the new opponent checkpoint and continue rollout.

If the existing weight-load order requires the checkpoint to be loaded first, the equivalent invariant is acceptable as long as the first observation/action after the swap comes from a freshly reset environment with zero/fresh recurrent state.

## Important constraints

- Do not alter self-play matchmaking/bank selection policy beyond what is required for clean swap boundaries.
- Do not change reward, terminal, or win-rate definitions.
- Do not fix unrelated 5c issues (#618/#619/#622) in this branch.
- Do not refactor the entire scheduler.
- Preserve async/sync behavior unless the reset bug specifically requires a small shared fix.
- Be explicit about CPU-vs-GPU environment reset behavior; do not fix one backend and silently leave the other inconsistent if both share this scheduler.

## Testing strategy

This bug needs a deterministic regression, not only a long training run. Prefer the smallest existing self-play test/harness that can expose scheduler state. If there is no suitable test, add a focused test or debug harness that uses short episodes with deliberately staggered lengths so that:

1. Environment A reaches a boundary early and starts another episode.
2. Environment B reaches the scheduler boundary later.
3. A checkpoint swap occurs while A would otherwise be mid-game.
4. Assert A is reset at the swap.
5. Assert its recurrent hidden state is cleared/reset.
6. Assert the first post-swap transition belongs entirely to the new checkpoint epoch.

If the repository has no practical unit seam for native CUDA self-play, provide a minimal reproducible run plus instrumentation/assertions in a test-only path, but do not leave production debug logging behind.

Also run the repository's normal 5c build/test commands available on the current branch. Record GPU/CUDA prerequisites exactly; do not claim a CUDA test passed if the machine cannot run it.

## Review checklist

- [ ] Swap cannot occur in the middle of an environment episode.
- [ ] RNN/MinGRU state is reset at the same boundary.
- [ ] Reset covers all affected environments, not only the last one to reach `boundary_reached`.
- [ ] Existing scheduler cadence remains intact.
- [ ] No unrelated self-play changes.
- [ ] Regression test/harness demonstrates the old mixed-opponent trajectory and the corrected behavior.
- [ ] Build/tests are reported truthfully.

## Delivery

Commit suggestion:

```text
fix: reset self-play envs when swapping opponents
```

Push only to `Battleplus/PufferLib:fix/5c-selfplay-swap-reset`. **Do not open an upstream PR.** Return:

- branch URL;
- commit SHA/URL;
- `git diff upstream/5c...HEAD` or compare URL;
- changed files;
- exact tests/builds run and results;
- clean `git status`;
- any uncertainty about reset/RNN-state semantics.
