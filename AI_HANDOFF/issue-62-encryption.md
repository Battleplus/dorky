# dorky #62 — encryption at rest with AES-256-GCM

Status: **advanced / maintainer-design gate before implementation**

- Upstream issue: https://github.com/trishantpahwa/dorky/issues/62
- User fork: https://github.com/Battleplus/dorky
- Upstream branch: `main`
- Suggested branch after design approval: `feat/encryption-at-rest`
- Verified 2026-08-21: issue is open/unassigned, only stale-bot comment exists, and no matching open/closed PR was found.

## Important gate

The issue explicitly says **“Please comment before starting — crypto design deserves a second pair of eyes.”** Do not blindly implement this task. First re-check issue/PR state and get maintainer agreement on the proposed design, especially passphrase/key-check format and backward compatibility. If the implementation AI cannot comment on the upstream issue, prepare the design note and return it instead of coding.

## Goal

Opt-in client-side encryption so S3/Google Drive only receive ciphertext. Use Node's built-in `crypto`; no new crypto dependency.

Proposed user flow from the issue:

```text
dorky --init aws --encrypt
dorky --init google-drive --encrypt
```

MCP `init` gains `encrypt: boolean`.

## Proposed format from the issue

Key derivation:

```js
crypto.scryptSync(passphrase, salt, 32)
```

- random per-project 16-byte salt;
- passphrase from `DORKY_PASSPHRASE` or interactive password prompt for CLI;
- MCP requires env var, never interactive input.

Metadata is additive:

```json
{
  "encryption": {
    "algorithm": "aes-256-gcm",
    "salt": "<base64>",
    "keyCheck": "<base64>"
  }
}
```

Do not alter existing `stage-1-files` / `uploaded-files` shape. Their hashes remain **plaintext-content MD5** for existing change detection.

Uploaded file format proposed by the issue:

```text
"DORKY1" magic (6 bytes) | 12-byte IV | 16-byte GCM auth tag | ciphertext
```

## Design discussion to resolve before coding

Ask/confirm:

1. Exact `keyCheck` binary envelope and known plaintext constant.
2. Whether IV/tag order and magic are frozen as above.
3. Whether enabling encryption is only allowed at init or can be enabled for an existing project later.
4. Wrong-passphrase behavior and when validation occurs before any remote/local file mutation.
5. Relationship to #51 binary-safe downloads—verify current main already has the required binary-safe behavior before building encryption on top.
6. Whether history snapshots should be server-side copies of the encrypted live object when the current main supports that optimization.

Do not start until these semantics are sufficiently clear.

## Implementation requirements after approval

### Init

- add `--encrypt` boolean to CLI init;
- add `encrypt` boolean to MCP init schema;
- resolve passphrase before committing encrypted-project metadata;
- create salt/keyCheck and store only non-secret derivation metadata;
- never write passphrase or derived key to disk.

### Push

For encrypted projects:

1. read plaintext bytes;
2. compute the existing plaintext MD5 used by metadata/change detection;
3. encrypt bytes with a fresh random IV per object using AES-256-GCM;
4. upload the `DORKY1` envelope as `application/octet-stream`;
5. history snapshot must contain the same ciphertext for that version or a safe copy of it.

Unencrypted projects must retain current behavior byte-for-byte.

### Pull / checkout

- download bytes as binary;
- detect `DORKY1` magic;
- for encrypted projects, validate passphrase/keyCheck before writing any restored file;
- decrypt and authenticate GCM before writing plaintext;
- if authentication fails, do not leave partial/corrupt files;
- legacy objects without magic remain readable as plaintext for backward compatibility as specified by the issue.

### Security constraints

- use a cryptographically secure random IV (`crypto.randomBytes`);
- never reuse IVs under the same key;
- verify GCM auth tag before publishing plaintext to destination;
- do not log passphrase, derived key, plaintext secret contents, salt+key material combinations beyond the intended public metadata;
- avoid temporary plaintext files if not required by existing architecture;
- clear error for missing/wrong passphrase.

## Tests

Required by issue:

- encrypt/decrypt round trip on text and binary buffers;
- wrong key/passphrase fails authentication;
- `DORKY1` magic detection;
- unencrypted legacy data remains unchanged/readable;
- full encrypted AWS workflow E2E;
- pull and checkout restore byte-identical plaintext;
- wrong passphrase fails before any file is written;
- MCP init/push/pull semantics mirror CLI.

Run the full existing suite:

```bash
npm test
npm run test:unit
npm run test:e2e
```

If cloud credentials are unavailable, report the E2E as **not run**, never as passed.

## Documentation

README must document:

- opt-in usage;
- `DORKY_PASSPHRASE`;
- storage provider sees ciphertext;
- passphrase loss means data loss;
- encryption does not protect a compromised local machine while plaintext is in use;
- legacy/unencrypted compatibility behavior.

## Scope control

Do not bundle #56 shared-core refactor, #63 migrate, new key-management services, KMS integration, key rotation, or package-version bumps unless maintainer explicitly requests them.

## Delivery

After maintainer design approval, commit suggestion:

```text
feat: add client-side encryption at rest
```

Push only to `Battleplus/dorky:feat/encryption-at-rest`. **Do not open the upstream PR.** Return design approval link, branch URL, commit SHA, compare/diff, changed files, tests, security assumptions, and clean `git status`.
