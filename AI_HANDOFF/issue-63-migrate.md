# dorky #63 — finish `--migrate` between S3 and Google Drive

Status: **advanced / maintainer-semantics gate before implementation**

- Upstream issue: https://github.com/trishantpahwa/dorky/issues/63
- User fork: https://github.com/Battleplus/dorky
- Upstream branch: `main`
- Suggested branch after agreement: `feat/finish-migrate`
- Verified 2026-08-21: issue is open/unassigned, only stale-bot comment exists, and no matching open/closed PR was found.

## Important gate

The issue explicitly requests a comment before starting so resume/rollback semantics can be agreed. Do not blindly code this advanced task. Re-check current state, then obtain maintainer direction. If upstream commenting is unavailable, return a design proposal rather than implementing speculative migration semantics.

## Problem

`--migrate` is advertised but historically was not fully wired into execution. Desired behavior is to move a complete dorky project between AWS S3 and Google Drive **without losing live files or push history**.

Commands:

```text
dorky --migrate aws
dorky --migrate google-drive
```

MCP should expose a matching `migrate` tool with target `aws | google-drive`.

## Semantics to confirm with maintainer

Before coding, explicitly agree on:

1. idempotency when a migration is retried after interruption;
2. whether existing destination objects are overwritten, validated, or skipped;
3. how partial destination state is detected;
4. credential acquisition for both source and target while `.dorky/credentials.json` currently stores one provider;
5. exact point at which local credentials flip to the target provider;
6. whether source remote data is intentionally left intact after success (issue says yes, safer default);
7. cleanup expectations if target copy fails partway;
8. binary-safety prerequisite (#51) and whether current main already satisfies it.

## Required invariant

Migration is transactional with respect to **adopting the target**: a failure at any point must leave `.dorky/credentials.json` pointing to the original source provider. Destination may contain safely retryable partial copies, but local state must never claim migration succeeded until every required object is verified/copied.

## Implementation flow after approval

### 1. Validate

- target is exactly `aws` or `google-drive`;
- target differs from current provider;
- source credentials still work;
- target credentials are available before copying begins;
- metadata/history files are readable;
- project root/name is resolved exactly as normal push/pull code does.

### 2. Build an explicit migration manifest

Prefer a manifest derived from local metadata/history rather than ad-hoc traversal:

- every live path from `uploaded-files`;
- every history commit from `.dorky/history.json`;
- every `<project>/.dorky-history/<commit-id>/<path>` snapshot required for checkout.

The manifest should make progress/retry behavior deterministic.

### 3. Transfer live files

Reuse existing provider download/upload primitives. Preserve raw bytes and logical relative paths. Do not convert through UTF-8 strings.

Process one file/bounded batch at a time so large projects do not require loading the entire project in memory. If #58 has landed by execution time, reuse its concurrency helper rather than adding another.

### 4. Transfer history

Copy every snapshot needed by each local history commit. After migration, existing `--log` and `--checkout <old-id>` must work unchanged.

### 5. Verify target

Before credential flip, verify enough destination state to guarantee completeness. At minimum ensure all manifest objects exist and, where provider metadata permits, sizes/hashes match expected data. Reuse existing MD5 metadata carefully; do not assume multipart ETags are content MD5 if upload behavior changes before this task is implemented.

### 6. Commit provider switch

Only after all copy/verification steps succeed:

- write target credentials atomically or through the project's normal JSON write helper;
- leave `metadata.json` and `history.json` logically unchanged;
- report counts of live files and history commits/snapshots migrated;
- tell user source remote data was intentionally not deleted.

## MCP

Add a `migrate` tool:

```json
{
  "target": "aws | google-drive"
}
```

It must use the same migration core semantics and return structured/plain-text progress without interactive prompts. Missing target credentials should be a clear error.

## Tests

The issue requires an AWS → Google Drive E2E or mocked equivalent. Prefer deterministic provider fakes/unit seams if real dual-provider credentials are not available in CI.

Required coverage:

- rejects target == source;
- rejects unavailable target credentials before copying;
- copies live files byte-identically;
- copies all history snapshots;
- old commit IDs remain checkout-able after switch;
- simulated failure halfway leaves credentials on source;
- rerun after partial destination copy succeeds without corrupting/duplicating logical state;
- source data is not deleted;
- MCP target validation and success/failure messages.

Run:

```bash
npm test
npm run test:unit
npm run test:e2e
```

Report unavailable real-cloud tests honestly.

## Scope control

Do not combine encryption (#62), shared core (#56), destructive source cleanup, cross-account discovery, new provider support, or a broad storage abstraction rewrite unless maintainers explicitly request it.

## Delivery

After semantics are approved, suggested commit:

```text
feat: finish cross-provider migration
```

Push only to `Battleplus/dorky:feat/finish-migrate`. **Do not open an upstream PR.** Return maintainer discussion link, branch URL, commit SHA, compare/diff, changed files, tests, rollback/idempotency notes, and clean `git status`.
