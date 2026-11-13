import { afterEach, describe, expect, it } from 'vitest';
import { withConfirmation } from './speaker-confirmation';
import { mergeFamily, segmentFamilyRoot } from './speaker-family';
import { splitBySpeaker } from './speaker-split';
import { line, turnsAt } from './speaker-test-helpers';
import * as store from './store';

afterEach(() => {
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
