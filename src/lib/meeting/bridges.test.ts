import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFakes, expectConverted, fakes, frame, resetBridges } from './bridge-test-fakes';

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./bridge-test-fakes')).mockAsrBrowser(importOriginal));

vi.mock('@/lib/diarization/browser', async () =>
  (await import('./bridge-test-fakes')).mockDiarizationBrowser());

vi.mock('@/lib/langid', async () => (await import('./bridge-test-fakes')).mockLangid());

beforeEach(clearFakes);

afterEach(resetBridges);

describe('diarization bridge', () => {
  it('feeds the diarizer Float32 audio in [-1, 1], one sample per Int16 sample', async () => {
    const { startDiarization, pushDiarizationAudio } = await import('./diarization-bridge');
    startDiarization(['mic']);
    const pcm = frame();

    pushDiarizationAudio('mic', pcm, 4800);

    expect(fakes.diarizerPushes).toHaveLength(1);
    expectConverted(fakes.diarizerPushes[0].chunk, pcm);
    expect(fakes.diarizerPushes[0].startSample).toBe(4800);
    expect(pcm.byteLength).toBe(3200);
  });

  it('relabels a segment once a turn covering it closes', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('system');
    startDiarization(['system']);
    store.upsertSegment({ id: 'a', source: 'system', speaker: 'system:0', text: 'hi', start: 10, end: 12, final: true });
    store.upsertSegment({ id: 'b', source: 'system', speaker: 'system:0', text: 'yo', start: 12, end: 16, final: true });

    const emit = fakes.turnListeners.get('system')!;
    emit({ speaker: 'system:0', source: 'system', start: 9.8, end: 12.1 });
    emit({ speaker: 'system:1', source: 'system', start: 12.4, end: 15.9 });

    const bySpeaker = Object.fromEntries(store.getState().segments.map((s) => [s.id, s.speaker]));
    expect(bySpeaker).toEqual({ a: 'system:0', b: 'system:1' });
    expect(store.getState().speakers['system:1'].label).toBe('Speaker 2');
  });
});
describe('language-ID bridge', () => {
  it('feeds the detector Float32 audio in [-1, 1], one sample per Int16 sample', async () => {
    const { startLangId, pushLangIdAudio, resetLanguageOverride } = await import('./langid-bridge');
    resetLanguageOverride();
    startLangId(['mic']);
    const pcm = frame();

    pushLangIdAudio('mic', pcm);

    expect(fakes.langidPushes).toHaveLength(1);
    expectConverted(fakes.langidPushes[0], pcm);
  });
});

