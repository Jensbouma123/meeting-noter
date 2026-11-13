import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFakes, fakes, resetBridges } from './bridge-test-fakes';

vi.mock('@/lib/asr/browser', async (importOriginal) =>
  (await import('./bridge-test-fakes')).mockAsrBrowser(importOriginal));

vi.mock('@/lib/diarization/browser', async () =>
  (await import('./bridge-test-fakes')).mockDiarizationBrowser());

vi.mock('@/lib/langid', async () => (await import('./bridge-test-fakes')).mockLangid());

beforeEach(clearFakes);

afterEach(resetBridges);

describe('diarization bridge — failures and lookup', () => {
  it('disposes a diarizer whose worker errors and raises a warning (F1)', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./store-core')), ...(await import('./segment-store')), ...(await import('./append-mode')) };
    store.resetSession('mic');
    startDiarization(['mic']);

    fakes.errorListeners.get('mic')!('model load failed');

    expect(fakes.disposed).toEqual(['mic']);
    expect(store.getState().warning).toContain('model load failed');
  });

  it('relabels an appended recording on its own capture clock, leaving the earlier transcript alone', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./store-core')), ...(await import('./segment-store')), ...(await import('./append-mode')) };
    store.resetSession('mic');
    store.upsertSegment({ id: 'old', source: 'mic', speaker: 'mic:0', text: 'before', start: 0, end: 60, final: true });
    store.armAppend();
    store.resetSession('mic');
    startDiarization(['mic']);
    store.upsertSegment({ id: '1', source: 'mic', speaker: 'mic:0', text: 'after', start: 2, end: 4, final: true });

    fakes.turnListeners.get('mic')!({ speaker: 'mic:1', source: 'mic', start: 1.9, end: 4.1 });

    const segs = store.getState().segments;
    expect(segs.map((s) => [s.text, s.speaker, s.start])).toEqual([
      ['before', 'mic:0', 0],
      ['after', 'mic:1', 62],
    ]);
    store.cancelAppend();
  });

  it('keeps a long early turn overlapping a late segment among many turns (F2)', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = { ...(await import('./session-reset')), ...(await import('./store-core')), ...(await import('./segment-store')), ...(await import('./append-mode')) };
    store.resetSession('system');
    startDiarization(['system']);
    const emit = fakes.turnListeners.get('system')!;
    emit({ speaker: 'system:2', source: 'system', start: 0, end: 500 });
    for (let i = 0; i < 300; i += 1) {
      emit({ speaker: 'system:0', source: 'system', start: 10 + i, end: 10.2 + i });
    }
    store.upsertSegment({ id: 'z', source: 'system', speaker: 'system:1', text: 'x', start: 400, end: 401, final: true });
    emit({ speaker: 'system:2', source: 'system', start: 399, end: 402 });

    expect(store.getState().segments.find((s) => s.id === 'z')!.speaker).toBe('system:2');
  });
});

