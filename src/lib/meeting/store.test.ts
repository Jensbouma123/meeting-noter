import { describe, expect, it } from 'vitest';
import { defaultLabel, ensureSpeaker } from './speaker-registry';
import { getState, setState } from './store-core';
import { loadIdleSession, resetSession, restoreSnapshot } from './session-reset';
import type { Segment } from './types';

describe('speaker labels with diarization on both sources', () => {
  it('numbers speakers by first appearance, so mic:1 and system:1 are not both "Speaker 2"', () => {
    resetSession('both');
    for (const id of ['mic:0', 'system:0', 'mic:1', 'system:1']) ensureSpeaker(id, 'both');

    const speakers = getState().speakers;
    expect(['mic:0', 'system:0', 'mic:1', 'system:1'].map((id) => speakers[id].label)).toEqual([
      'You',
      'Speaker 1',
      'Speaker 2',
      'Speaker 3',
    ]);
    const colors = Object.values(speakers).map((s) => s.colorIndex);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('speaker labels when call audio never attached', () => {
  it('defaultLabel numbers mic:0 like any other diarized speaker instead of "You"', () => {
    expect(defaultLabel('mic:0', 'both', true)).toBe('Speaker 1');
    expect(defaultLabel('mic:1', 'both', true)).toBe('Speaker 2');
    expect(defaultLabel('mic:0', 'both', false)).toBe('You');
  });

  it('ensureSpeaker numbers every mic speaker once the session is flagged call-audio-missing, so the room is not called "You"', () => {
    resetSession('both');
    setState({ callAudioMissing: true });
    for (const id of ['mic:0', 'mic:1']) ensureSpeaker(id, 'both');

    const speakers = getState().speakers;
    expect(speakers['mic:0'].label).toBe('Speaker 1');
    expect(speakers['mic:1'].label).toBe('Speaker 2');
  });
});

describe('saved sessions and overlaps', () => {
  const saved = (over: Partial<Segment> = {}): Segment => ({
    id: 's', source: 'mic', speaker: 'mic:0', text: 'hi', start: 0, end: 1, final: true, ...over,
  });

  it('loads a session saved before overlaps, and keeps a saved overlap', () => {
    const overlap = { start: 0, end: 1, speakers: ['mic:0', 'mic:1'] };
    expect(loadIdleSession('old', { segments: [saved()], speakers: {}, startedAt: null })).toBe(true);
    expect(getState().segments).toEqual([saved()]);

    restoreSnapshot([saved({ overlap })], {});
    expect(getState().segments[0].overlap).toEqual(overlap);
  });

  it('drops a malformed overlap rather than the line', () => {
    const bad = saved({ overlap: { start: 0, end: 1, speakers: 'mic:0' } as unknown as Segment['overlap'] });
    loadIdleSession('bad', { segments: [bad, saved({ id: 't', overlap: null as unknown as Segment['overlap'] })], speakers: {}, startedAt: null });
    expect(getState().segments.map((s) => [s.id, 'overlap' in s])).toEqual([['s', false], ['t', false]]);
  });
});
