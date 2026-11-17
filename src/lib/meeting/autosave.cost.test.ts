import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finalSegment, installMemoryStorage, snapshot } from './session-store.testUtils';

beforeEach(installMemoryStorage);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const big = (id: string, n: number) => ({
  ...snapshot(id),
  segments: Array.from({ length: n }, (_, i) => finalSegment(`g${i}`, i, i + 1, `line ${i}`)),
});

describe('autosave tick cost', () => {
  it('stringifies and writes the transcript once per tick', async () => {
    const { saveAutosavedSession } = await import('./autosave');
    const { sessionTranscriptKey } = await import('./session-transcript-storage');
    saveAutosavedSession(big('a', 5) as never);
    const setItem = vi.spyOn(localStorage, 'setItem');
    const stringify = vi.spyOn(JSON, 'stringify');
    saveAutosavedSession(big('a', 6) as never);
    const transcriptWrites = setItem.mock.calls.filter(([k]) => k === sessionTranscriptKey('a'));
    expect(transcriptWrites).toHaveLength(1);
    expect(setItem.mock.calls.filter(([k]) => k.startsWith('mn.autosave'))).toHaveLength(0);
    expect(stringify.mock.calls.filter(([v]) => (v as { segments?: unknown[] })?.segments?.length === 6)).toHaveLength(1);
  });

  it('restores through the pointer slot and still reads legacy inline slots', async () => {
    const { saveAutosavedSession, loadAutosavedSession, AUTOSAVE_KEY } = await import('./autosave');
    saveAutosavedSession(big('a', 3) as never);
    expect(localStorage.getItem(AUTOSAVE_KEY)!.length).toBeLessThan(100);
    expect(loadAutosavedSession()?.segments).toHaveLength(3);
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ version: 1, savedAt: Date.now(), sessionId: 'old', title: 'T', segments: big('old', 2).segments, speakers: {}, startedAt: null }),
    );
    expect(loadAutosavedSession()).toMatchObject({ sessionId: 'old' });
    expect(loadAutosavedSession()?.segments).toHaveLength(2);
  });

  it('detects edits by reference without stringifying or parsing the transcript', async () => {
    const { saveAutosavedSession } = await import('./autosave');
    const sync = await import('./sync-queue');
    const queued = vi.spyOn(sync, 'queueMeetingSync');
    const input = big('a', 4);
    saveAutosavedSession(input as never);
    queued.mockClear();
    saveAutosavedSession({ ...input } as never);
    expect(queued).not.toHaveBeenCalled();
    const parse = vi.spyOn(JSON, 'parse');
    saveAutosavedSession({ ...input, segments: [...input.segments, finalSegment('new', 9, 10)] } as never);
    expect(queued).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls.filter(([raw]) => String(raw).includes('line 3'))).toHaveLength(0);
  });
});

describe('server sync flush cost', () => {
  it('parses the stored transcript once per built meeting', async () => {
    const { createDraftSession } = await import('./session-crud');
    const { saveAutosavedSession } = await import('./autosave');
    const { buildStoredMeeting } = await import('./stored-meeting');
    const id = createDraftSession('Long');
    saveAutosavedSession({ ...big(id, 50), sessionId: id } as never);
    const parse = vi.spyOn(JSON, 'parse');
    const meeting = buildStoredMeeting(id);
    const transcriptParses = parse.mock.calls.filter(([raw]) => String(raw).includes('line 49'));
    expect(meeting?.segments).toHaveLength(50);
    expect(transcriptParses).toHaveLength(1);
  });
});
