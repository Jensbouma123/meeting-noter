import { afterEach, describe, expect, it } from 'vitest';
import { publishLiveUpdate } from './speaker-attribution';
import { line, turnsAt } from './speaker-test-helpers';
import * as store from './store';

afterEach(() => {
  store.cancelAppend();
  store.resetSession('mic');
});

describe('store.replaceSegmentFamily', () => {
  it('replaces a line and its parts where the line was, leaving other lines alone', () => {
    store.resetSession('mic');
    store.upsertSegment(line('x', ['before'], 0));
    store.upsertSegment(line('s1', ['a', 'b'], 1));
    store.upsertSegment(line('s1~1', ['c'], 3));
    store.upsertSegment(line('s10', ['after'], 5));

    store.replaceSegmentFamily('s1', [line('s1', ['a'], 1, 'mic:1'), line('s1~1', ['b', 'c'], 2, 'mic:2')]);

    expect(store.getState().segments.map((s) => [s.id, s.text, s.speaker])).toEqual([
      ['x', 'before', 'mic:0'],
      ['s1', 'a', 'mic:1'],
      ['s1~1', 'b c', 'mic:2'],
      ['s10', 'after', 'mic:0'],
    ]);
    expect(store.getState().speakers['mic:2']).toBeDefined();
  });

  it('places the parts of an appended recording past the earlier transcript', () => {
    store.resetSession('mic');
    store.upsertSegment(line('old', ['earlier'], 0));
    store.armAppend();
    store.resetSession('mic');
    const offset = store.getState().segments[0].end;

    store.replaceSegmentFamily('s1', [line('s1', ['a'], 1), line('s1~1', ['b'], 2, 'mic:1')]);

    const [, first, second] = store.getState().segments;
    expect([first.id, second.id]).toEqual(['a1:s1', 'a1:s1~1']);
    expect(first.start).toBeCloseTo(1 + offset);
    expect(second.words![0].start).toBeCloseTo(2 + offset);
  });
});

describe('publishLiveUpdate', () => {
  const update = (final: boolean) => ({
    id: 'live-1',
    text: 'a b c d',
    startSample: 0,
    endSample: 3.8 * 16000,
    final,
    words: ['a', 'b', 'c', 'd'].map((text, i) => ({ text, start: i * 16000, end: (i + 0.8) * 16000 })),
  });
  const speakerAt = (_source: 'mic' | 'system', start: number, end: number) =>
    turnsAt([['mic:0', 0, 1.9], ['mic:1', 2, 4]])(start, end);
  const timeline = {
    speakerFor: speakerAt,
    speakerNear: speakerAt,
    changePoints: () => [],
    turnEnds: () => [],
  };

  it('splits a line across a known speaker change while open, and keeps the split when it closes', () => {
    store.resetSession('mic');
    publishLiveUpdate('mic', update(false), timeline, () => 'mic:0');
    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.final])).toEqual([
      ['live-1', 'mic:0', false],
      ['live-1~2', 'mic:1', false],
    ]);

    publishLiveUpdate('mic', update(true), timeline, () => 'mic:0');
    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.text])).toEqual([
      ['live-1', 'mic:0', 'a b'],
      ['live-1~2', 'mic:1', 'c d'],
    ]);
  });

  it('without a timeline, stores the line whole under the fallback speaker', () => {
    store.resetSession('mic');
    publishLiveUpdate('mic', update(true), null, () => 'mic:0');
    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.text])).toEqual([['live-1', 'mic:0', 'a b c d']]);
    expect(store.getState().segments[0].words![3]).toEqual({ text: 'd', start: 3, end: 3.8 });
  });
});

describe('unconfirmed speakers', () => {
  const update = (final: boolean) => ({
    id: 'live-u',
    text: 'a b',
    startSample: 10 * 16000,
    endSample: 12 * 16000,
    final,
    words: ['a', 'b'].map((text, i) => ({ text, start: (10 + i) * 16000, end: (10.9 + i) * 16000 })),
  });
  const timelineOf = (covers: boolean) => ({
    speakerFor: () => (covers ? 'mic:1' : null),
    speakerNear: () => 'mic:0',
    changePoints: () => [],
    turnEnds: () => [],
  });

  it('marks a line no turn covers yet, and clears it once one does', () => {
    store.resetSession('mic');
    publishLiveUpdate('mic', update(false), timelineOf(false), () => 'mic:0');
    expect(store.getState().segments[0]).toMatchObject({ speaker: 'mic:0', unconfirmed: true });
    publishLiveUpdate('mic', update(true), timelineOf(true), () => 'mic:0');
    expect(store.getState().segments[0].unconfirmed).toBeUndefined();
  });

  it('never marks a line without a timeline', () => {
    store.resetSession('mic');
    publishLiveUpdate('mic', update(true), null, () => 'mic:0');
    expect(store.getState().segments[0].unconfirmed).toBeUndefined();
  });

  it('confirmAllSegments resolves leftovers to their guessed speaker', () => {
    store.resetSession('mic');
    publishLiveUpdate('mic', update(true), timelineOf(false), () => 'mic:0');
    expect(store.getState().segments[0].unconfirmed).toBe(true);
    store.confirmAllSegments();
    expect(store.getState().segments[0]).toMatchObject({ speaker: 'mic:0' });
    expect(store.getState().segments[0].unconfirmed).toBeUndefined();
  });
});
