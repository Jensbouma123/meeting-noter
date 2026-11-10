import { afterEach, describe, expect, it } from 'vitest';
import {
  attributeSpeakers,
  mergeFamily,
  publishLiveUpdate,
  setOverlapTimeline,
  segmentFamilyRoot,
  splitBySpeaker,
  withConfirmation,
  type OverlapAt,
  type SpeakerAt,
} from './speaker-attribution';
import * as store from './store';
import type { Segment } from './types';

/** A final line of words one second each, from `at`. */
function line(id: string, words: string[], at = 0, speaker = 'mic:0'): Segment {
  const timed = words.map((text, i) => ({ text, start: at + i, end: at + i + 0.8 }));
  return {
    id,
    source: 'mic',
    speaker,
    text: words.join(' '),
    start: at,
    end: at + words.length - 0.2,
    final: true,
    words: timed,
  };
}

/** Turns as [speaker, start, end]; the speaker with the most time wins. */
function turnsAt(turns: [string, number, number][]): SpeakerAt {
  return (start, end) => {
    let best: string | null = null;
    let bestTime = 0;
    for (const [speaker, a, b] of turns) {
      const t = Math.min(end, b) - Math.max(start, a);
      if (t > bestTime) {
        best = speaker;
        bestTime = t;
      }
    }
    return best;
  };
}

afterEach(() => {
  setOverlapTimeline(null);
  store.cancelAppend();
  store.resetSession('mic');
});

describe('splitBySpeaker', () => {
  it('splits a final line between words where the speaker changes; the first part keeps the id', () => {
    const seg = line('s1', ['so', 'we', 'agree', 'yes', 'we', 'do'], 10);
    const parts = splitBySpeaker(seg, turnsAt([['mic:0', 9, 12.9], ['mic:1', 13, 16]]));

    expect(parts.map((p) => [p.id, p.speaker, p.text, p.start, p.end])).toEqual([
      ['s1', 'mic:0', 'so we agree', 10, 12.8],
      ['s1~3', 'mic:1', 'yes we do', 13, seg.end],
    ]);
    expect(parts[1].words!.map((w) => w.text)).toEqual(['yes', 'we', 'do']);
  });

  it('relabels a line all of one speaker without splitting it, and returns it as is when nothing changes', () => {
    const seg = line('s1', ['one', 'two'], 0);
    expect(splitBySpeaker(seg, turnsAt([['mic:2', 0, 5]]))).toEqual([{ ...seg, speaker: 'mic:2' }]);
    expect(splitBySpeaker(seg, turnsAt([['mic:0', 0, 5]]))[0]).toBe(seg);
  });

  it('gives a word no turn covers its neighbour speaker', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd'], 0);
    // Word "b" (1–1.8) and "c" (2–2.8) fall in the gap between the turns.
    const parts = splitBySpeaker(seg, turnsAt([['mic:0', 0, 0.9], ['mic:1', 3, 4]]));
    expect(parts.map((p) => [p.speaker, p.text])).toEqual([
      ['mic:0', 'a b c'],
      ['mic:1', 'd'],
    ]);
  });

  it('splits an open line too, but never one whose text is not its words', () => {
    const turns = turnsAt([['mic:0', 0, 1.9], ['mic:1', 2, 4]]);
    const open = { ...line('s1', ['a', 'b', 'c'], 0), final: false };
    expect(splitBySpeaker(open, turns).map((p) => [p.id, p.speaker, p.final])).toEqual([
      ['s1', 'mic:0', false],
      ['s1~2', 'mic:1', false],
    ]);
    const edited = { ...line('s2', ['a', 'b', 'c'], 0), text: 'a b c.' };
    expect(splitBySpeaker(edited, turns)).toHaveLength(1);
    const noWords = { ...line('s3', ['a', 'b', 'c'], 0), words: undefined };
    expect(splitBySpeaker(noWords, turns)).toHaveLength(1);
  });

  it('given coverage, parts off the words no turn has reached yet, even under one speaker', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd'], 0);
    const turns = turnsAt([['mic:0', 0, 1.9]]);
    const parts = withConfirmation(splitBySpeaker(seg, turns, turns), turns);
    expect(parts.map((p) => [p.id, p.speaker, p.text, !!p.unconfirmed])).toEqual([
      ['s1', 'mic:0', 'a b', false],
      ['s1~2', 'mic:0', 'c d', true],
    ]);
  });

  it('keeps the line as it is when no turn says anything about it', () => {
    const seg = line('s1', ['a', 'b'], 0);
    expect(splitBySpeaker(seg, () => null)).toEqual([seg]);
  });

  it('re-splits a merged family: a later turn moves the boundary, or merges the parts back', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd'], 0);
    const first = splitBySpeaker(seg, turnsAt([['mic:0', 0, 1.9], ['mic:1', 2, 4]]));
    expect(first.map((p) => p.id)).toEqual(['s1', 's1~2']);

    const merged = mergeFamily(first);
    expect(merged).toMatchObject({ id: 's1', text: 'a b c d', start: 0, end: seg.end, final: true });
    const moved = splitBySpeaker(merged, turnsAt([['mic:0', 0, 0.9], ['mic:1', 1, 4]]));
    expect(moved.map((p) => [p.id, p.speaker, p.text])).toEqual([
      ['s1', 'mic:0', 'a'],
      ['s1~1', 'mic:1', 'b c d'],
    ]);
    const back = splitBySpeaker(mergeFamily(moved), turnsAt([['mic:1', 0, 4]]));
    expect(back.map((p) => [p.id, p.speaker, p.text])).toEqual([['s1', 'mic:1', 'a b c d']]);
  });

  it('names parts after their root', () => {
    expect(segmentFamilyRoot('live-4~7')).toBe('live-4');
    expect(segmentFamilyRoot('a1:live-4')).toBe('a1:live-4');
  });
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

describe('overlapping speech', () => {
  const overlap = { start: 12, end: 14, speakers: ['mic:0', 'mic:1'] };
  const overlaps: OverlapAt = (a, b) => (a < overlap.end && b > overlap.start ? [overlap] : []);
  // mic:0 talks 9–14, mic:1 12–17; inside the overlap mic:0 has "c", mic:1 "d".
  const primary = turnsAt([['mic:0', 9, 12.9], ['mic:1', 13, 17]]);

  it('cuts the overlap\'s words into parts of their own, each still one speaker\'s', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 10);
    const parts = splitBySpeaker(seg, primary, undefined, overlaps);

    expect(parts.map((p) => [p.id, p.speaker, p.text, !!p.overlap])).toEqual([
      ['s1', 'mic:0', 'a b', false],
      ['s1~2', 'mic:0', 'c', true],
      ['s1~3', 'mic:1', 'd', true],
      ['s1~4', 'mic:1', 'e f', false],
    ]);
    expect(parts[1].overlap).toEqual(overlap);
    expect(parts[0]).not.toHaveProperty('overlap');
  });

  it('marks a whole line that lies inside an overlap, and clears it once the overlap is gone', () => {
    const seg = line('s1', ['c', 'd'], 12, 'mic:1');
    const [inside] = splitBySpeaker(seg, () => 'mic:1', undefined, overlaps);
    expect(inside).toMatchObject({ speaker: 'mic:1', overlap });

    const [after] = splitBySpeaker(inside, () => 'mic:1', undefined, () => []);
    expect(after).not.toHaveProperty('overlap');
    // Nothing to change: the same segment back.
    expect(splitBySpeaker(inside, () => 'mic:1', undefined, overlaps)[0]).toBe(inside);
  });

  it('leaves overlap alone without a lookup, and a merged family drops it to be found again', () => {
    const parts = splitBySpeaker(line('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 10), primary, undefined, overlaps);
    expect(splitBySpeaker(parts[1], () => 'mic:0')[0]).toBe(parts[1]);
    expect(mergeFamily(parts)).not.toHaveProperty('overlap');
  });

  it('attributeSpeakers keeps its three-argument call, reading the installed overlap lookup', () => {
    const seg = line('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 10);
    expect(attributeSpeakers(seg, primary, primary).some((p) => p.overlap)).toBe(false);

    const asked: string[] = [];
    setOverlapTimeline((source, a, b) => {
      asked.push(source);
      return overlaps(a, b);
    });
    const parts = attributeSpeakers(seg, primary, primary);
    expect(asked[0]).toBe('mic');
    expect(parts.filter((p) => p.overlap).map((p) => [p.speaker, p.text])).toEqual([
      ['mic:0', 'c'],
      ['mic:1', 'd'],
    ]);
  });
});
