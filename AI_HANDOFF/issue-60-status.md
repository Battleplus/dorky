# Issue #60 execution plan — add `--status`

Upstream issue: https://github.com/trishantpahwa/dorky/issues/60

Suggested branch: `feat/status-command`

## Stop conditions before coding

Re-check all of the following first:

- Issue #60 is still open.
- No assignee / human claim has appeared.
- Searching all open and closed PRs for `repo:trishantpahwa/dorky 60` still finds no implementation.
- Latest upstream `main` does not already contain `--status`, alias `-st`, a `status()` implementation, or an MCP `status` tool.

If any of these changed, stop and report instead of creating duplicate work.

## Branch setup

```bash
git clone https://github.com/Battleplus/dorky.git
cd dorky
git remote add upstream https://github.com/trishantpahwa/dorky.git
git fetch upstream
git switch -c feat/status-command upstream/main
```

Read `AGENTS.md` before editing. Important constraints: `bin/index.js` and `bin/mcp.js` currently duplicate command behavior, `bin/` is CommonJS, and metadata paths are POSIX-normalized.

## Required behavior

`dorky --status` / `dorky -st` must be a **purely local, read-only command**. It must not call `checkCredentials()`, AWS, Google Drive, OAuth, or mutate `.dorky/metadata.json`.

Compute state from:

- disk state,
- `meta["stage-1-files"]`,
- `meta["uploaded-files"]`.

Required sections:

| Section | Condition |
|---|---|
| Modified since staged | disk exists and current MD5 != staged hash |
| Staged, not pushed | staged exists and uploaded missing or hash differs |
| Pending remote deletion | uploaded exists and staged missing |
| Missing locally | tracked in staged or uploaded but file missing on disk |
| Up to date | no actionable differences, or per-file disk/staged/uploaded agree |

Recommended implementation approach:

```js
function getStatus(meta) {
    const staged = meta["stage-1-files"] || {};
    const uploaded = meta["uploaded-files"] || {};

    const modified = [];
    const stagedNotPushed = [];
    const pendingDeletion = [];
    const missing = [];
    const upToDate = [];

    const trackedFiles = new Set([
        ...Object.keys(staged),
        ...Object.keys(uploaded),
    ]);

    for (const f of trackedFiles) {
        const s = staged[f];
        const u = uploaded[f];
        const exists = existsSync(f);

        if (!exists) {
            missing.push(f);
            if (u && !s) pendingDeletion.push(f);
            continue;
        }

        const diskHash = md5(readFileSync(f));

        if (s && diskHash !== s.hash) modified.push(f);
        if (s && (!u || s.hash !== u.hash)) stagedNotPushed.push(f);
        if (u && !s) pendingDeletion.push(f);

        if (s && u && diskHash === s.hash && s.hash === u.hash) {
            upToDate.push(f);
        }
    }

    return { modified, stagedNotPushed, pendingDeletion, missing, upToDate };
}
```

Do not use a repository-wide glob to derive these tracked states.

## CLI changes — `bin/index.js`

Add the yargs option:

```js
.option("status", {
    alias: "st",
    describe: "Show file states",
    type: "boolean"
})
```

Add `status()` that calls `checkDorkyProject()`, reads metadata, computes state, and renders stable section headings with the project's existing `chalk` style.

Wire it into `main()`:

```js
if (args.status !== undefined) status();
```

Add a `Status` entry to the interactive menu.

Suggested stable output wording:

```text
Modified since staged:
  .env

Staged, not pushed:
  config/local.json

Pending remote deletion:
  obsolete.secret

Missing locally:
  credentials.json

Up to date:
  app.config
```

Empty sections may be hidden or shown as `(none)`. A completely clean state may be rendered as `Everything is up to date.`

## MCP changes — `bin/mcp.js`

Add a `status` tool with an empty input schema:

```js
{
    name: "status",
    description: "Show modified, staged, pushed, pending-deletion, and missing local file state.",
    inputSchema: { type: "object", properties: {} }
}
```

Add the handler:

```js
case "status":
    result = status();
    break;
```

MCP output must be plain text and must not trigger credentials/provider logic.

## Tests

Add local E2E coverage under `tests/e2e/cli.test.js`. This issue should not require cloud credentials.

Cover at least:

1. Modified since staged: write file, put original hash in staged metadata, mutate disk, assert status output.
2. Staged, not pushed: staged entry exists, uploaded missing/different.
3. Pending remote deletion: uploaded exists, staged missing.
4. Missing locally: tracked metadata entry exists but disk file is absent.
5. Up to date: disk hash == staged hash == uploaded hash.
6. `--status` works with no credentials configured and emits no credential/OAuth error.
7. `-st` behaves like `--status`.

Important edge case: an uploaded-only missing file may legitimately be both `Missing locally` and `Pending remote deletion`. Do not drop deletion semantics just to de-duplicate display.

## README

Add `--status` / `-st` to the Usage/Commands section and state that it compares local disk, staged metadata, and pushed metadata without network access.

Do not bump package versions.

## Validation

Run:

```bash
npm test
npm run test:e2e
node bin/index.js --help
git diff --check
git diff upstream/main...HEAD
```

Ensure there is no unrelated formatting, refactor, package/version change, `extension/` change, or `web-app/` change.

## Commit / push

Suggested commit:

```text
feat: add local status command
```

Then:

```bash
git push -u origin feat/status-command
```

**Do not open an upstream PR.** Return only:

- branch URL,
- final commit SHA / URL,
- compare URL or diff summary,
- changed files,
- exact test commands and results,
- `git status`,
- any blockers or risk.

## Prepared upstream PR text — do not submit yet

Title:

```text
feat: add git-like status command
```

Body:

```markdown
## Summary
- add `dorky --status` / `-st` for a local view of tracked file state
- report modified-since-staged, staged-not-pushed, pending deletions, missing local files, and up-to-date state
- expose the same status view through the MCP server
- add local E2E coverage and README usage docs

## Testing
- `npm test`
- `npm run test:e2e`

Closes #60
```
