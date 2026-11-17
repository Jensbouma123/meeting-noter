import { describe, expect, it } from 'vitest';
import { isMigratableKey } from './allowlist';
import { EXPORT_TYPE, LIMITS, PROTOCOL_VERSION } from './constants';
import { parseExportMessage } from './parse-export';

const data = (entries: unknown) => ({ type: EXPORT_TYPE, version: PROTOCOL_VERSION, entries });
const parse = (origin: string, payload: unknown) => parseExportMessage({ origin, data: payload });

describe('parseExportMessage', () => {
  it.each(['http://127.0.0.1:3000', 'http://localhost:3000'])('accepts allowlisted entries from %s', (origin) => {
    expect(
      parse(
        origin,
        data([
          ['mn.settings', '{"a":1}'],
          ['mn.session.abc-123.v1', '[]'],
        ]),
      ),
    ).toEqual([
      ['mn.settings', '{"a":1}'],
      ['mn.session.abc-123.v1', '[]'],
    ]);
  });

  it.each([
    'http://localhost:47823',
    'http://localhost:3001',
    'https://localhost:3000',
    'http://evil.example:3000',
    'http://localhost:3000.evil.example',
    'null',
    '',
  ])('refuses origin %j', (origin) => {
    expect(parse(origin, data([['mn.settings', '{}']]))).toBeNull();
  });

  it('refuses the whole message when one key is not allowlisted', () => {
    expect(
      parse(
        'http://localhost:3000',
        data([
          ['mn.settings', '{}'],
          ['mn.model-registry.v1', '{}'],
        ]),
      ),
    ).toBeNull();
    expect(parse('http://localhost:3000', data([['mn.session.../x.v1', '{}']]))).toBeNull();
  });

  it('refuses wrong shapes, types and versions', () => {
    const o = 'http://localhost:3000';
    expect(parse(o, null)).toBeNull();
    expect(parse(o, { ...data([]), type: 'other' })).toBeNull();
    expect(parse(o, { ...data([]), version: 2 })).toBeNull();
    expect(parse(o, data('nope'))).toBeNull();
    expect(parse(o, data([['mn.settings', 42]]))).toBeNull();
    expect(parse(o, data([['mn.settings']]))).toBeNull();
  });

  it('enforces the size limits', () => {
    const o = 'http://localhost:3000';
    expect(parse(o, data([['mn.settings', 'x'.repeat(LIMITS.maxValueChars + 1)]]))).toBeNull();
    const big = 'x'.repeat(LIMITS.maxValueChars);
    expect(
      parse(
        o,
        data([
          ['mn.settings', big],
          ['mn.title', big],
          ['mn.vocabulary', 'x'],
        ]),
      ),
    ).toBeNull();
    expect(parse(o, data(Array.from({ length: LIMITS.maxEntries + 1 }, () => ['mn.title', ''])))).toBeNull();
  });
});

describe('isMigratableKey', () => {
  it('allows the 0.5.1 settings, flags and recording keys only', () => {
    for (const key of [
      'mn.onboarding.done',
      'mn.sessions.v1',
      'mn.participants.p1.v1',
      'mn.speaker-state.s1.v1',
      'mn.model-consent.v1',
    ]) {
      expect(isMigratableKey(key)).toBe(true);
    }
    for (const key of [
      'mn.model-registry.v1',
      'mn.heartbeatClientId',
      'capture-debug',
      'mn.session.a.v2',
      'x',
      42,
      null,
    ]) {
      expect(isMigratableKey(key)).toBe(false);
    }
  });
});
