// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mergeEntries } from './merge-entries';
import type { LegacyEntry } from './types';

const index = (...ids: string[]) => JSON.stringify({ version: 1, sessions: ids.map((sessionId) => ({ sessionId, title: sessionId, createdAt: 1 })) });
const dump = () => Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '').map((k) => [k, localStorage.getItem(k)]));
const ids = () => (JSON.parse(localStorage.getItem('mn.sessions.v1') ?? '{}') as { sessions: { sessionId: string }[] }).sessions.map((s) => s.sessionId);

describe('mergeEntries', () => {
  beforeEach(() => localStorage.clear());

  it('copies missing keys and never overwrites what the new origin has', () => {
    localStorage.setItem('mn.title', 'new');
    const entries: LegacyEntry[] = [['mn.title', 'old'], ['mn.settings', '{"lang":"nl"}']];
    expect(mergeEntries(localStorage, entries)).toBe(1);
    expect(localStorage.getItem('mn.title')).toBe('new');
    expect(localStorage.getItem('mn.settings')).toBe('{"lang":"nl"}');
  });

  it('merges the session index by id', () => {
    localStorage.setItem('mn.sessions.v1', index('b', 'c'));
    expect(mergeEntries(localStorage, [['mn.sessions.v1', index('a', 'b')]])).toBe(1);
    expect(ids()).toEqual(['b', 'c', 'a']);
  });

  it('is idempotent', () => {
    const entries: LegacyEntry[] = [['mn.sessions.v1', index('a')], ['mn.session.a.v1', '[]'], ['mn.onboarding.done', '1']];
    expect(mergeEntries(localStorage, entries)).toBe(3);
    const snapshot = dump();
    expect(mergeEntries(localStorage, entries)).toBe(0);
    expect(dump()).toEqual(snapshot);
  });
});
