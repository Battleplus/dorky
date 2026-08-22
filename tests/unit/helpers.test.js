import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import the REAL production helpers — not copies.
const { toPosix, normalizeKeys, readMetadata, readHistory } = require('../../lib/path-helpers.js');

const BS = String.fromCharCode(92); // backslash

// ── toPosix ────────────────────────────────────────────────────────────────

describe('toPosix', () => {
  it('converts backslashes to forward slashes', () => {
    expect(toPosix('C:' + BS + 'Users' + BS + 'test' + BS + 'file.txt')).toBe('C:/Users/test/file.txt');
    expect(toPosix('already/forward/slashes.txt')).toBe('already/forward/slashes.txt');
  });

  it('handles empty string', () => {
    expect(toPosix('')).toBe('');
  });

  it('handles null and undefined', () => {
    expect(toPosix(null)).toBe(null);
    expect(toPosix(undefined)).toBe(undefined);
  });
});

// ── normalizeKeys ──────────────────────────────────────────────────────────

describe('normalizeKeys', () => {
  it('normalizes Windows-style keys to posix paths', () => {
    expect(normalizeKeys({ ['C:' + BS + 'Users' + BS + 'test']: 'value' })).toEqual({
      'C:/Users/test': 'value',
    });
  });

  it('leaves already-forward keys unchanged', () => {
    expect(normalizeKeys({ 'already/forward': 'value' })).toEqual({
      'already/forward': 'value',
    });
  });

  it('returns empty object for null / undefined', () => {
    expect(normalizeKeys(null)).toEqual({});
    expect(normalizeKeys(undefined)).toEqual({});
  });

  it('returns empty object for empty object', () => {
    expect(normalizeKeys({})).toEqual({});
  });

  it('preserves values', () => {
    const input = { ['a' + BS + 'b']: 1, 'c/d': { nested: true } };
    expect(normalizeKeys(input)).toEqual({ 'a/b': 1, 'c/d': { nested: true } });
  });
});

// ── readMetadata (production function) ─────────────────────────────────────

describe('readMetadata', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dorky-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns sane defaults when metadata file does not exist', () => {
    const metaPath = join(tmpDir, 'metadata.json');
    const meta = readMetadata(metaPath);
    // readJson returns {} when file missing, so stage-1-files and uploaded-files
    // come back as normalizeKeys(undefined) = {}
    expect(meta['stage-1-files']).toEqual({});
    expect(meta['uploaded-files']).toEqual({});
  });

  it('normalizes Windows-style keys in stage-1-files', () => {
    const metaPath = join(tmpDir, 'metadata.json');
    writeFileSync(metaPath, JSON.stringify({
      'stage-1-files': { ['C:' + BS + 'Users' + BS + 'test.txt']: 'hash1' },
      'uploaded-files': {},
    }));
    const meta = readMetadata(metaPath);
    expect(meta['stage-1-files']).toEqual({ 'C:/Users/test.txt': 'hash1' });
  });

  it('normalizes Windows-style keys in uploaded-files', () => {
    const metaPath = join(tmpDir, 'metadata.json');
    writeFileSync(metaPath, JSON.stringify({
      'stage-1-files': {},
      'uploaded-files': { ['D:' + BS + 'data' + BS + 'file.csv']: 'hash2' },
    }));
    const meta = readMetadata(metaPath);
    expect(meta['uploaded-files']).toEqual({ 'D:/data/file.csv': 'hash2' });
  });
});

// ── readHistory (production function) ──────────────────────────────────────

describe('readHistory', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dorky-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when history file does not exist', () => {
    const historyPath = join(tmpDir, 'history.json');
    expect(readHistory(historyPath)).toEqual([]);
  });

  it('normalizes Windows file keys in history entries', () => {
    const historyPath = join(tmpDir, 'history.json');
    writeFileSync(historyPath, JSON.stringify([
      { files: { ['C:' + BS + 'Users' + BS + 'test.txt']: 'hash1' }, timestamp: 1234567890 },
      { files: { 'already/forward.txt': 'hash2' }, timestamp: 1234567891 },
    ]));
    const history = readHistory(historyPath);
    expect(history[0].files).toEqual({ 'C:/Users/test.txt': 'hash1' });
    expect(history[1].files).toEqual({ 'already/forward.txt': 'hash2' });
  });
});
