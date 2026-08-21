# Issue #61 execution plan — `--list remote --update`

Upstream issue: https://github.com/trishantpahwa/dorky/issues/61

Suggested branch: `feat/list-remote-update`

## Stop conditions before coding

Re-check all of the following first:

- Issue #61 is still open.
- No assignee / human claim has appeared.
- Searching all open and closed PRs for `repo:trishantpahwa/dorky 61` still finds no implementation.
- Latest upstream `main` does not already contain `--list remote --update` or equivalent metadata-rebuild behavior.

If any condition changed, stop and report rather than duplicating work.

## Branch setup

```bash
git clone https://github.com/Battleplus/dorky.git
cd dorky
git remote add upstream https://github.com/trishantpahwa/dorky.git
git fetch upstream
git switch -c feat/list-remote-update upstream/main
```

Read `AGENTS.md`. Important constraints: `bin/index.js` and `bin/mcp.js` currently duplicate behavior, `bin/` is CommonJS, and metadata keys should be POSIX-normalized.

## Required CLI behavior

Add:

```text
dorky --list remote --update
```

`--list remote` must continue listing remote files. With `--update`, it must also rebuild `.dorky/metadata.json` `uploaded-files` from the **current live remote state**, without downloading file contents.

Add a yargs boolean option:

```js
.option("update", {
    describe: "Rebuild local metadata from remote storage",
    type: "boolean",
    default: false
})
```

Change the list call chain to accept the flag:

```js
async function list(type, update = false) { /* ... */ }

if (args.list !== undefined) await list(args.list, args.update);
```

`--update` alone must not trigger a hidden command. Its side effect applies only to the remote-list path.

## Remote state model

During the existing remote walk, collect path -> MD5 rather than just file names:

```js
const remoteState = {};
```

Only include **live files**. Exclude `.dorky-history/` completely.

Use `toPosix()` on relative paths before writing metadata.

## AWS S3

The issue explicitly permits using `ListObjectsV2` `ETag` as MD5 because current dorky uploads are single-part `PutObject` uploads.

Recommended pattern:

```js
const prefix = root + "/";
for (const o of data.Contents || []) {
    const rel = toPosix(o.Key.slice(prefix.length));
    if (!rel || rel === ".dorky-history" || rel.startsWith(".dorky-history/")) continue;

    const hash = typeof o.ETag === "string"
        ? o.ETag.replace(/"/g, "")
        : undefined;

    if (hash) remoteState[rel] = hash;
}
```

If latest upstream already has S3 pagination/helper logic, reuse it rather than reintroducing a one-page list. Do not turn this issue into a separate S3 refactor.

## Google Drive

Extend recursive list fields from:

```text
files(id, name, mimeType)
```

to:

```text
files(id, name, mimeType, md5Checksum)
```

For non-folder files:

```js
const rel = toPosix(path.join(p, f.name));
if (!rel.startsWith(".dorky-history/") && rel !== ".dorky-history" && f.md5Checksum) {
    remoteState[rel] = f.md5Checksum;
}
```

Prefer not to recurse into the `.dorky-history` folder at all, with the prefix check retained as defense-in-depth.

## Rebuild `uploaded-files`

Read previous uploaded state, construct a **new** map, then replace the old map only when `update` is true.

```js
const previousUploaded = meta["uploaded-files"] || {};
const nextUploaded = {};

for (const [f, hash] of Object.entries(remoteState)) {
    nextUploaded[f] = {
        "mime-type": mimeTypes.lookup(f) || "application/octet-stream",
        hash,
    };
}
```

Compute summary buckets:

```js
const added = [];
const removed = [];
const changed = [];

for (const f of Object.keys(nextUploaded)) {
    if (!previousUploaded[f]) added.push(f);
    else if (previousUploaded[f].hash !== nextUploaded[f].hash) changed.push(f);
}
for (const f of Object.keys(previousUploaded)) {
    if (!nextUploaded[f]) removed.push(f);
}
```

Then:

```js
if (update) {
    meta["uploaded-files"] = nextUploaded;
    // Preserve meta["stage-1-files"] exactly.
    writeJson(METADATA_PATH, meta);
}
```

Required semantics:

- `uploaded-files` is replaced, not merged.
- remote-deleted files disappear from metadata.
- `stage-1-files` remains untouched.
- `.dorky-history/` never enters live metadata.
- empty remote live state must be able to clear old `uploaded-files` to `{}`.

Do not return early on “No remote files found” before update logic runs.

## Summary output

Print a clear stable summary, at least counts:

```text
Metadata updated: <A> added, <R> removed, <C> changed.
```

`changed` should primarily mean hash changed. MIME is derived from the path and does not need a separate category.

## MCP changes — `bin/mcp.js`

Mirror the same semantics:

- change `list(type)` -> `list(type, update = false)`,
- collect the same remote path/hash state,
- exclude history,
- replace `uploaded-files` only when `update` is true,
- preserve staged state,
- return summary text.

Add `update` to the existing `list` tool schema:

```js
update: {
    type: "boolean",
    description: "Rebuild local uploaded-files metadata from current remote state."
}
```

Change dispatch:

```js
case "list":
    result = await list(args.remote ? "remote" : undefined, Boolean(args.update));
    break;
```

MCP should return plain text, not CLI spinner output.

## E2E test — AWS path required

Use the existing `tests/e2e/cli.test.js` runner pattern.

Required scenario:

1. Initialize an AWS-backed test project.
2. Create at least two files and `--add` / `--push` them.
3. Read correct `.dorky/metadata.json` and preserve staged state for comparison.
4. Corrupt uploaded metadata deliberately:
   - remove one real entry,
   - give another real entry a wrong hash,
   - optionally add a ghost remote-nonexistent entry.
5. Run:

```text
dorky --list remote --update
```

6. Re-read metadata and assert:
   - all real remote live files restored,
   - hashes restored,
   - ghost removed,
   - `.dorky-history/...` absent,
   - `stage-1-files` unchanged.
7. Assert summary output has correct added/removed/changed semantics.
8. Delete a local tracked file.
9. Run `--pull` and assert the file is restored, proving rebuilt metadata is consumable by the real pull path.
10. Clean up with `--destroy`.

Also add high-value coverage if practical:

- empty live remote state clears stale uploaded metadata,
- `--help` includes `--update`,
- MCP schema exposes `update` if there is already a practical MCP schema test pattern.

## README

Tick the roadmap item for `--list remote --update` only after implementation and tests are complete.

Do not rewrite unrelated roadmap/docs.

## Validation

Run:

```bash
npm test
npm run test:e2e
node bin/index.js --help
git diff --check
git diff upstream/main...HEAD
```

Cloud E2E requires real credentials. If unavailable, explicitly report what was not run. Never claim an unrun cloud test passed.

## Do not change

- package version,
- `extension/`,
- `web-app/`,
- authentication design,
- unrelated push/pull semantics,
- #56 shared-core architecture,
- other roadmap features.

## Commit / push

Suggested commit:

```text
feat: rebuild local metadata from remote listing
```

Push:

```bash
git push -u origin feat/list-remote-update
```

**Do not open an upstream PR.** Return only:

- branch URL,
- final commit SHA / URL,
- compare URL or diff summary,
- changed files,
- exact tests + results,
- `git status`,
- unrun cloud tests and why,
- blockers/risks.

## Prepared upstream PR text — do not submit yet

Title:

```text
feat: rebuild local metadata from remote listing
```

Body:

```markdown
## Summary
- add `--list remote --update` to rebuild local `uploaded-files` metadata from remote state
- use S3 ETags / Google Drive `md5Checksum` without downloading file contents
- exclude `.dorky-history/`, preserve `stage-1-files`, and report added/removed/changed counts
- expose the same `update` option through the MCP `list` tool
- add E2E coverage and update the README roadmap

## Testing
- `npm test`
- `npm run test:e2e`

Closes #61
```
