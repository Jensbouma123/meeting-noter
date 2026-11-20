import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearTurns, insertTurn } from './diarization-turns';
import { splitTranscript } from './split-transcript';
import { setTranscriptSessionId } from './transcript-session';
import type { Segment } from './types';

function mic(id: string, speaker: string, start: number, end: number): Segment {
  return { id, source: 'mic', speaker, text: id, start, end, final: true, echo: 'speech' };
}

function keptIds(segments: Segment[]): string[] {
  return splitTranscript(segments).flatMap((block) => block.segments.map((seg) => seg.id));
}

beforeEach(() => {
  setTranscriptSessionId(null);
  clearTurns();
  insertTurn({ source: 'system', speaker: 'system:0', start: 0, end: 10 });
  insertTurn({ source: 'mic', speaker: 'mic:0', start: 0, end: 10 });
  insertTurn({ source: 'mic', speaker: 'mic:1', start: 4, end: 6 });
  insertTurn({ source: 'mic', speaker: 'mic:1', start: 12, end: 20 });
});

afterEach(() => {
  setTranscriptSessionId(null);
});

describe('mic bleed pieces in splitTranscript', () => {
  it('drops a bleed-slot piece over remote speech that has no system segment', () => {
    expect(keptIds([mic('bleed', 'mic:0', 2, 3)])).toEqual([]);
  });

  it('keeps a real local piece overlapping remote speech', () => {
    expect(keptIds([mic('local', 'mic:1', 4.2, 5.8)])).toEqual(['local']);
  });

  it('keeps a bleed-slot piece outside the system turns', () => {
    expect(keptIds([mic('outside', 'mic:0', 11, 11.8)])).toEqual(['outside']);
  });

  it('keeps the piece when the turns belong to another session', () => {
    setTranscriptSessionId('other');
    expect(keptIds([mic('bleed', 'mic:0', 2, 3)])).toEqual(['bleed']);
  });
});
