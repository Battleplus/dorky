const { existsSync, readFileSync, writeFileSync } = require("fs");

/**
 * Helper functions extracted from bin/index.js so they can be unit-tested.
 * All are pure (or filesystem-coupled with injectable paths) and have no
 * CLI side effects.
 */

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p)) : {});
const writeJson = (p, d) => writeFileSync(p, JSON.stringify(d, null, 2));

/** Convert Windows backslashes to forward slashes. Null/empty-safe. */
const toPosix = (p) => (p ? p.replace(/\\/g, "/") : p);

const escapeDriveName = (name) => name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

/**
 * Normalize object keys to POSIX form, preserving values.
 * `null`/`undefined` input yields `{}`.
 */
const normalizeKeys = (obj) => {
  if (!obj) return {};
  const out = {};
  for (const k of Object.keys(obj)) out[toPosix(k)] = obj[k];
  return out;
};

/**
 * Parse a .dorkyignore file into an exclusion list.
 * Both `\n` and `\r\n` line endings produce the same list; blank lines are
 * ignored.
 */
const parseDorkyignore = (content) =>
  (content || "").split(/\r?\n/).filter(Boolean);

module.exports = {
  readJson,
  writeJson,
  toPosix,
  escapeDriveName,
  normalizeKeys,
  parseDorkyignore,
};