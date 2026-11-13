import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowser, memoryStorage } from './speaker-resume-browser';
import { appendMeeting, fake, loadPage, recordFirstMeeting } from './speaker-resume-fakes';

vi.mock('./diarization-bridge', async () => (await import('./speaker-resume-fakes')).mockDiarizationBridge());

let storage: Storage;

describe('appending a recording to a session', () => {
  beforeEach(() => {
    storage = memoryStorage();
    fake.turns.length = 0;
    installBrowser(storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps each returning speaker on their label after a reload', async () => {
    const id = await recordFirstMeeting();
    const resumed = await appendMeeting(id);
    expect(resumed.firstId).toBe('mic:1');
    expect(resumed.first).toBe('Bob');
    expect(resumed.second).toBe('Speaker 1');
    expect(Object.keys(resumed.speakers).sort()).toEqual(['mic:0', 'mic:1']);
  }, 30_000);

  it('still appends to a session saved without speaker state, numbering afresh', async () => {
    const id = await recordFirstMeeting();
    const { speakerStateKey } = await import('./speaker-state-storage');
    storage.removeItem(speakerStateKey(id));
    const resumed = await appendMeeting(id);
    expect(resumed.firstId).toBe('mic:0');
    expect(resumed.first).toBe('Speaker 1');
  }, 30_000);

  it('drops the speaker state with the transcript', async () => {
    const id = await recordFirstMeeting();
    const { loadSpeakerState } = await import('./speaker-state-storage');
    expect(loadSpeakerState(id)?.mic).toBeDefined();
    const page = await loadPage();
    expect(page.sessions.clearSessionTranscript(id)).toBe(true);
    const persist = await import('./speaker-state-storage');
    expect(persist.loadSpeakerState(id)).toBeNull();
  }, 30_000);
});
