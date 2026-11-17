import { describe, expect, it } from 'vitest';
import { consentedAndCached, fakes } from './diarization-bridge-fakes';
import './diarization-labels.testSupport';

describe('diarization bridge — provisional labels', () => {
  const words = (text: string, start: number) =>
    text
      .split(' ')
      .map((w, i) => ({ text: w, start: (start + i * 0.5) * 16000, end: (start + i * 0.5 + 0.4) * 16000 }));
  const update = (text: string, start: number, final = false) => ({
    id: 'live-1',
    text,
    startSample: start * 16000,
    endSample: (start + text.split(' ').length * 0.5) * 16000,
    final,
    words: words(text, start),
  });

  async function wired(sources: ('mic' | 'system')[]) {
    const m = await consentedAndCached();
    const { asrState } = await import('./asr/state');
    const { publishLiveUpdate } = await import('./speaker-attribution');
    m.bridge.startDiarization(sources);
    const tl = asrState.speakerTimeline!;
    const label = asrState.speakerLabeler;
    const publish = (source: 'mic' | 'system', u: ReturnType<typeof update>) =>
      publishLiveUpdate(source, u, tl, () => label(source, new Float32Array(0)));
    const line = () => m.store.getState().segments.map((s) => [s.id, s.speaker]);
    return { ...m, publish, line };
  }

  it('labels a line from its capture source the moment it is published, before any turn', async () => {
    const { store, publish, line } = await wired(['mic', 'system']);
    store.resetSession('both');
    publish('mic', update('hello there', 1));
    expect(line()).toEqual([['live-1', 'mic:0']]);
    expect(store.getState().speakers['mic:0'].label).toBe('You');
  });

  it('labels a call line with the last call speaker seen, then refines it in place when its turn arrives', async () => {
    const { store, publish, line } = await wired(['system']);
    store.resetSession('both');
    const emit = fakes.turn.get('system')!;
    emit({ speaker: 'system:2', source: 'system', start: 0, end: 4, id: 'system#0', final: true });
    publish('system', update('so what now', 5));
    expect(line()).toEqual([['live-1', 'system:2']]);
    emit({ speaker: 'system:3', source: 'system', start: 4.8, end: 6.4, id: 'system#1', final: false });
    expect(line()).toEqual([['live-1', 'system:3']]);
    const pending = () => store.getState().segments.map((s) => !!s.unconfirmed);
    publish('system', update('so what now then', 5));
    expect(line()).toEqual([
      ['live-1', 'system:3'],
      ['live-1~3', 'system:3'],
    ]);
    expect(pending()).toEqual([false, true]);
    publish('system', update('so what now then', 5, true));
    expect(line()).toEqual([
      ['live-1', 'system:3'],
      ['live-1~3', 'system:3'],
    ]);
    emit({ speaker: 'system:3', source: 'system', start: 4.8, end: 7, id: 'system#1', final: true });
    expect(line()).toEqual([['live-1', 'system:3']]);
    expect(pending()).toEqual([false]);
  });

  it('splits an open line where its words change speaker, before the line closes', async () => {
    const { store, publish, line } = await wired(['mic']);
    store.resetSession('mic');
    const emit = fakes.turn.get('mic')!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 5.3, id: 'mic#0', final: true });
    publish('mic', update('a b c d', 5));
    expect(line()).toEqual([
      ['live-1', 'mic:0'],
      ['live-1~1', 'mic:0'],
    ]);
    expect(store.getState().segments.map((s) => !!s.unconfirmed)).toEqual([false, true]);
    emit({ speaker: 'mic:1', source: 'mic', start: 5.45, end: 8, id: 'mic#1', final: false });
    expect(line()).toEqual([
      ['live-1', 'mic:0'],
      ['live-1~1', 'mic:1'],
    ]);
    expect(store.getState().segments.map((s) => !!s.unconfirmed)).toEqual([false, false]);
    publish('mic', update('a b c d e', 5));
    expect(line()).toEqual([
      ['live-1', 'mic:0'],
      ['live-1~1', 'mic:1'],
    ]);
  });

  it('never flips an open line between the turn nearest it and the latest speaker', async () => {
    const { store, publish, line } = await wired(['mic']);
    const emit = fakes.turn.get('mic')!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4, id: 'mic#0', final: true });
    publish('mic', update('one two', 5));
    emit({ speaker: 'mic:1', source: 'mic', start: 9, end: 12, id: 'mic#1', final: true });
    expect(line()).toEqual([['live-1', 'mic:0']]);
    const seen = new Set<string>();
    for (const text of ['one two three', 'one two three four']) {
      publish('mic', update(text, 5));
      seen.add(store.getState().segments[0].speaker);
    }
    expect([...seen]).toEqual(['mic:0']);
  });

  it('confirms a line said before the first turn with the nearest turn, once the diarizer is past it', async () => {
    const { store, publish, line } = await wired(['mic']);
    const emit = fakes.turn.get('mic')!;
    const pending = () => store.getState().segments.map((s) => !!s.unconfirmed);
    publish('mic', update('I do not know', 5, true));
    expect(pending()).toEqual([true]);
    emit({ speaker: 'mic:1', source: 'mic', start: 7.4, end: 7.8, id: 'mic#0', final: true });
    expect(line()).toEqual([['live-1', 'mic:1']]);
    expect(pending()).toEqual([true]);
    emit({ speaker: 'mic:2', source: 'mic', start: 9, end: 12, id: 'mic#1', final: true });
    expect(line()).toEqual([['live-1', 'mic:1']]);
    expect(pending()).toEqual([false]);
  });
});
