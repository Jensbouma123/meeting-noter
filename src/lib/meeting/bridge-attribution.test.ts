import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFakes, fakes, resetBridges } from './bridge-test-fakes';

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./bridge-test-fakes')).mockAsrBrowser(importOriginal));

vi.mock('@/lib/diarization/browser', async () =>
  (await import('./bridge-test-fakes')).mockDiarizationBrowser());

vi.mock('@/lib/langid', async () => (await import('./bridge-test-fakes')).mockLangid());

beforeEach(clearFakes);

afterEach(resetBridges);

describe('diarization bridge — word-level attribution', () => {
  function wordsLine(id: string, words: string[], at: number) {
    return {
      id,
      source: 'mic' as const,
      speaker: 'mic:0',
      text: words.join(' '),
      start: at,
      end: at + words.length - 0.2,
      final: true,
      words: words.map((text, i) => ({ text, start: at + i, end: at + i + 0.8 })),
    };
  }

  it('splits a line already final when a late turn shows the speaker changed inside it', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./segment-store')), ...(await import('./store-core')) };
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    emit({ speaker: 'mic:0', source: 'mic', start: 9.5, end: 12.9 });
    store.upsertSegment(wordsLine('s1', ['so', 'we', 'agree', 'yes', 'we', 'do'], 10));

    emit({ speaker: 'mic:1', source: 'mic', start: 13, end: 16 });

    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.text])).toEqual([
      ['s1', 'mic:0', 'so we agree'],
      ['s1~3', 'mic:1', 'yes we do'],
    ]);
  });

  it('moves the boundary of a split line when a later turn corrects it', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./segment-store')), ...(await import('./store-core')) };
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    store.upsertSegment(wordsLine('s1', ['a', 'b', 'c', 'd'], 0));
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 1.5 });
    emit({ speaker: 'mic:1', source: 'mic', start: 2, end: 4 });
    expect(store.getState().segments.map((s) => s.text)).toEqual(['a b', 'c d']);
    emit({ speaker: 'mic:1', source: 'mic', start: 1.2, end: 2 });

    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.text])).toEqual([
      ['s1', 'mic:0', 'a'],
      ['s1~1', 'mic:1', 'b c d'],
    ]);
  });

  it('marks the words where two speakers talk at once, each word in its own speaker\'s part', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./segment-store')), ...(await import('./store-core')) };
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    store.upsertSegment(wordsLine('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 0));
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4 });
    emit({ speaker: 'mic:1', source: 'mic', start: 2, end: 6 });

    const segments = store.getState().segments;
    expect(segments.map((s) => [s.speaker, s.text, s.overlap ?? null])).toEqual([
      ['mic:0', 'a b', null],
      ['mic:0', 'c', { start: 2, end: 4, speakers: ['mic:0', 'mic:1'] }],
      ['mic:1', 'd', { start: 2, end: 4, speakers: ['mic:0', 'mic:1'] }],
      ['mic:1', 'e f', null],
    ]);
  });

  it('does not count turns touching for under MIN_OVERLAP_SECONDS as overlap', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const { MIN_OVERLAP_SECONDS } = await import('./diarization-overlaps');
    const store = { ...(await import('./session-reset')), ...(await import('./segment-store')), ...(await import('./store-core')) };
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    store.upsertSegment(wordsLine('s1', ['a', 'b', 'c', 'd'], 0));
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 2 });
    emit({ speaker: 'mic:1', source: 'mic', start: 2 - MIN_OVERLAP_SECONDS / 2, end: 4 });

    expect(store.getState().segments.some((s) => s.overlap)).toBe(false);
  });

  it('relabels lines from before the first turn once it arrives', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./segment-store')), ...(await import('./store-core')) };
    store.resetSession('mic');
    startDiarization(['mic']);
    store.upsertSegment(wordsLine('early', ['hello', 'there'], 1));

    fakes.turnListeners.get('mic')!({ speaker: 'mic:2', source: 'mic', start: 5, end: 8 });

    expect(store.getState().segments.map((s) => [s.id, s.speaker])).toEqual([['early', 'mic:2']]);
  });
});

