# Issue #58 execution plan — bounded remote concurrency + Drive folder cache

Upstream issue: https://github.com/trishantpahwa/dorky/issues/58

Suggested branch: `perf/remote-concurrency`

## Stop conditions before coding

Re-check all of the following:

- #58 is still open.
- No assignee / human claim has appeared.
- Searching all open and closed PRs for `repo:trishantpahwa/dorky 58` still finds no implementation.
- Latest upstream `main` does not already contain an equivalent concurrency limiter or Drive folder-path cache.

If any condition changed, stop and report rather than duplicating work.

## Branch setup

```bash
git clone https://github.com/Battleplus/dorky.git
cd dorky
git remote add upstream https://github.com/trishantpahwa/dorky.git
git fetch upstream
git switch -c perf/remote-concurrency upstream/main
```

Read `AGENTS.md`. Keep CLI/MCP behavior mirrored. Do not turn this into the #56 shared-core refactor.

## Scope

This issue fixes exactly two things:

1. Unbounded per-file remote concurrency.
2. Repeated Google Drive folder lookups.

Do not fix unrelated issues such as Drive pull path correctness (#52), S3 server-side history copy (#57), metadata rebuild (#61), migration, or versioning.

## Add a dependency-free `mapLimit`

Recommended small CommonJS helper, e.g. `bin/map-limit.js`:

```js
async function mapLimit(items, limit, fn) {
    if (!Number.isInteger(limit) || limit < 1) {
        throw new TypeError("limit must be a positive integer");
    }

    const results = new Array(items.length);
    let next = 0;

    const worker = async () => {
        while (true) {
            const idx = next++;
            if (idx >= items.length) return;
            results[idx] = await fn(items[idx], idx);
        }
    };

    const workerCount = Math.min(limit, items.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
}

module.exports = { mapLimit };
```

Use a fixed constant such as:

```js
const REMOTE_CONCURRENCY = 8;
```

Requirements:

- result order matches input order,
- errors reject/propagate,
- empty input returns `[]`,
- no third-party dependency.

## S3 changes — both `bin/index.js` and `bin/mcp.js`

Replace unbounded **per-file remote** `Promise.all(files.map(...))` patterns with `mapLimit(..., REMOTE_CONCURRENCY, ...)` for:

- push uploads,
- push deletes,
- history archive uploads,
- pull downloads,
- checkout downloads.

Do not mechanically replace every `Promise.all` in the repository; only the per-file remote request fan-outs in scope.

Progress/spinner counters should still increment after each successful remote operation. Do not swallow errors or mark metadata/history successful after a failed remote operation.

## Google Drive folder cache

Current folder resolution repeatedly walks every path segment with `files.list`. Add a **per-command** cache keyed by full normalized folder path:

```js
const folderCache = new Map();

// Good cache keys:
// project
// project/config
// project/.dorky-history/abcd1234/config
```

Do not key only by basename: different parents may contain folders with the same name.

Recommended signature:

```js
async function getFolderId(pathStr, drive, create = true, folderCache = new Map()) {
    // resolve each prefix from root
    // cache full-prefix -> folder id (or null for create=false not-found)
}
```

Cache lifetime must be per command / run, not process-global.

## Avoid duplicate folder creation

Do not let multiple upload workers race to create the same Drive folder.

Preferred pattern:

1. Compute distinct parent directory paths for the batch.
2. Resolve/create those parent directories **serially** using `getFolderId(..., folderCache)`.
3. Store path -> folderId.
4. Run file upload/delete/get work with `mapLimit`.

Example for uploads:

```js
const root = path.basename(process.cwd());
const parentPaths = [...new Set(filesToUpload.map(f =>
    path.posix.dirname(path.posix.join(root, f.name))
))];

const parentIds = new Map();
for (const parentPath of parentPaths) {
    parentIds.set(
        parentPath,
        await getFolderId(parentPath, drive, true, folderCache)
    );
}

await mapLimit(filesToUpload, REMOTE_CONCURRENCY, async (f) => {
    const parentPath = path.posix.dirname(path.posix.join(root, f.name));
    const parentId = parentIds.get(parentPath);
    await drive.files.create({
        requestBody: { name: path.posix.basename(f.name), parents: [parentId] },
        media: { mimeType: f["mime-type"], body: createReadStream(f.name) },
    });
});
```

Apply the same principle to:

- normal Drive uploads,
- remote deletions where a parent must be resolved,
- history archive uploads,
- checkout from history.

For Drive pull, this PR should only bound concurrency. Do **not** repair the existing basename/global lookup semantics; that belongs to #52.

## MCP consistency

`bin/mcp.js` must use the same limit and folder-cache strategy.

Keep returned results stable where practical. If concurrent callbacks produce text, prefer returning values from `mapLimit` and joining them in input order rather than pushing into a shared result array in completion order.

## Unit tests

Create `tests/unit/map-limit.test.js` with Vitest. Cover at least:

1. Ordering: tasks with different delays still produce results in input order.
2. Concurrency cap: track `active` / `maxActive`; assert `maxActive <= limit` and preferably `> 1`.
3. Error propagation: a worker throw/rejection rejects `mapLimit`.
4. Empty input returns `[]`.
5. Invalid limit throws `TypeError` if the guard is implemented.

Example import for a CommonJS helper from ESM/Vitest:

```js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { mapLimit } = require("../../bin/map-limit.js");
```

If a small fake-Drive test can be added without large refactoring, also verify that multiple files sharing one parent cause that parent path to be resolved once. Do not export half the application only to make this test possible.

## Validation

Run:

```bash
npm test
npm run test:unit

# If credentials/environment support it:
npm run test:e2e

git diff --check
git diff upstream/main...HEAD
rg "Promise\\.all|mapLimit|getFolderId|folderCache" bin tests
```

Manually confirm that all in-scope per-file remote fan-outs in **both binaries** are bounded.

If cloud E2E cannot run because credentials are unavailable, report that explicitly. Never state that an unrun cloud test passed.

## Do not change

- #52 Drive pull lookup semantics,
- #56 shared core architecture,
- #57 S3 server-side copy,
- #61 metadata rebuild,
- package versions,
- `extension/`,
- `web-app/`,
- unrelated formatting.

## Commit / push

Suggested commit:

```text
perf: bound remote file concurrency
```

Push:

```bash
git push -u origin perf/remote-concurrency
```

**Do not open an upstream PR.** Return only:

- branch URL,
- final commit SHA / URL,
- compare URL or diff summary,
- changed files,
- exact tests + results,
- `git status`,
- any unrun cloud tests and why,
- blockers/risks.

## Prepared upstream PR text — do not submit yet

Title:

```text
perf: bound remote file concurrency
```

Body:

```markdown
## Summary
- add a dependency-free concurrency limiter for remote per-file operations
- cap S3/Drive upload, download, checkout, and archive work at a fixed concurrency
- cache Google Drive folder IDs per command and pre-resolve distinct parent folders
- add unit coverage for ordering, concurrency limits, and error propagation

## Testing
- `npm test`
- `npm run test:unit`
- `git diff --check`

Closes #58
```
