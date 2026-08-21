import { describe, it, expect } from 'vitest';

const BS = String.fromCharCode(92); // backslash

// Re-implement the helpers exactly as they appear in bin/index.js
const toPosix = (p) => (p ? p.split(BS).join('/') : p);

const normalizeKeys = (obj) => {
  if (!obj) return {};
  const out = {};
  for (const k of Object.keys(obj)) out[toPosix(k)] = obj[k];
  return out;
};

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

describe('readMetadata shape', () => {
  it('normalizeKeys is idempotent on empty objects', () => {
    const meta = { 'stage-1-files': {}, 'uploaded-files': {} };
    meta['stage-1-files'] = normalizeKeys(meta['stage-1-files']);
    meta['uploaded-files'] = normalizeKeys(meta['uploaded-files']);
    expect(meta).toEqual({ 'stage-1-files': {}, 'uploaded-files': {} });
  });

  it('normalizeKeys fixes windows keys inside metadata', () => {
    const meta = {
      'stage-1-files': { ['C:' + BS + 'Users' + BS + 'test.txt']: 'hash1' },
      'uploaded-files': {},
    };
    meta['stage-1-files'] = normalizeKeys(meta['stage-1-files']);
    meta['uploaded-files'] = normalizeKeys(meta['uploaded-files']);
    expect(meta['stage-1-files']).toEqual({ 'C:/Users/test.txt': 'hash1' });
  });
});

describe('readHistory shape', () => {
  it('normalizes windows file keys in history entries', () => {
    const history = [
      { files: { ['C:' + BS + 'Users' + BS + 'test.txt']: 'hash1' }, timestamp: 1234567890 },
      { files: { 'already/forward.txt': 'hash2' }, timestamp: 1234567891 },
    ];
    const normalized = history.map((e) => ({
      ...e,
      files: normalizeKeys(e.files),
    }));
    expect(normalized[0].files).toEqual({ 'C:/Users/test.txt': 'hash1' });
    expect(normalized[1].files).toEqual({ 'already/forward.txt': 'hash2' });
  });
});
