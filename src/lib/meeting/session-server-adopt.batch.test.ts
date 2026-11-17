// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeetingSummaryRow } from '@/lib/meeting-db/types';
import { adoptMeetingSummaries } from './session-server-adopt';
import { readSessionIndex } from './session-index';

function row(i: number, title = `t${i}`): MeetingSummaryRow {
  return {
    id: `m${i}`,
    title,
    createdAt: i,
    updatedAt: i,
    startedAt: i,
    durationSeconds: 1,
    segmentCount: 1,
    isDraft: false,
    captureMode: 'mic',
    speakers: [],
    folderId: null,
    folderSuggestionDeclined: [],
  };
}

function measure(n: number) {
  localStorage.clear();
  const get = vi.spyOn(Storage.prototype, 'getItem');
  const set = vi.spyOn(Storage.prototype, 'setItem');
  const parse = vi.spyOn(JSON, 'parse');
  const events = vi.fn();
  window.addEventListener('mn:sessions-changed', events);
  adoptMeetingSummaries(Array.from({ length: n }, (_, i) => row(i)));
  window.removeEventListener('mn:sessions-changed', events);
  const out = {
    get: get.mock.calls.length,
    set: set.mock.calls.length,
    parse: parse.mock.calls.length,
    events: events.mock.calls.length,
  };
  vi.restoreAllMocks();
  return out;
}

describe('adoptMeetingSummaries', () => {
  beforeEach(() => localStorage.clear());

  it('does constant storage work and one event regardless of row count', () => {
    const small = measure(2);
    const large = measure(60);
    expect(large).toEqual(small);
    expect(large.set).toBe(1);
    expect(large.events).toBe(1);
  });

  it('upserts existing entries in place and appends new ones', () => {
    adoptMeetingSummaries([row(1), row(2)]);
    adoptMeetingSummaries([row(2, 'renamed'), row(3), row(3, 'again')]);
    const list = readSessionIndex().sessions;
    expect(list.map((s) => s.sessionId)).toEqual(['m1', 'm2', 'm3']);
    expect(list[1].title).toBe('renamed');
    expect(list[2].title).toBe('again');
  });
});
