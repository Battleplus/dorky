import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import {
  readJson,
  toPosix,
  normalizeKeys,
  parseDorkyignore,
} from "../../lib/helpers.js";

describe("toPosix", () => {
  it("converts Windows backslashes to forward slashes", () => {
    expect(toPosix("a\\b\\c.txt")).toBe("a/b/c.txt");
    expect(toPosix("C:\\Users\\me\\.env")).toBe("C:/Users/me/.env");
  });

  it("leaves POSIX paths untouched", () => {
    expect(toPosix("a/b/c.txt")).toBe("a/b/c.txt");
  });

  it("is null/empty-safe", () => {
    expect(toPosix(null)).toBe(null);
    expect(toPosix("")).toBe("");
    expect(toPosix(undefined)).toBe(undefined);
  });
});

describe("normalizeKeys", () => {
  it("normalizes backslash keys to POSIX while preserving values", () => {
    const out = normalizeKeys({ "a\\b": 1, "c/d": 2 });
    expect(out).toEqual({ "a/b": 1, "c/d": 2 });
  });

  it("returns {} for null/undefined", () => {
    expect(normalizeKeys(null)).toEqual({});
    expect(normalizeKeys(undefined)).toEqual({});
    expect(normalizeKeys()).toEqual({});
  });

  it("preserves values verbatim", () => {
    const value = { hash: "abc", "mime-type": "text/plain" };
    expect(normalizeKeys({ "a\\b": value })).toEqual({ "a/b": value });
  });
});

describe("parseDorkyignore", () => {
  it("parses LF-separated entries", () => {
    expect(parseDorkyignore("node_modules\n.env\nbuild/\n")).toEqual([
      "node_modules",
      ".env",
      "build/",
    ]);
  });

  it("parses CRLF-separated entries identically", () => {
    expect(parseDorkyignore("node_modules\r\n.env\r\nbuild/\r\n")).toEqual([
      "node_modules",
      ".env",
      "build/",
    ]);
  });

  it("ignores blank lines", () => {
    expect(parseDorkyignore("node_modules\n\n.env\n")).toEqual([
      "node_modules",
      ".env",
    ]);
  });

  it("handles empty/missing content", () => {
    expect(parseDorkyignore("")).toEqual([]);
    expect(parseDorkyignore()).toEqual([]);
  });
});

describe("readJson", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dorky-unit-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns {} for a missing file", () => {
    expect(readJson(path.join(tmpDir, "missing.json"))).toEqual({});
  });

  it("parses an existing JSON file", () => {
    const file = path.join(tmpDir, "data.json");
    fs.writeFileSync(file, JSON.stringify({ a: 1 }));
    expect(readJson(file)).toEqual({ a: 1 });
  });
});