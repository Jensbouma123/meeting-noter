import { describe, expect, it } from 'vitest';
import { TurnTracker } from './turns';

function frames(channel: string): Float32Array {
  return Float32Array.from(channel, (c) => (c === '#' ? 0.9 : 0.05));
}

describe('TurnTracker pauses', () => {
  it('records bridged pauses longer than pauseSec inside a run', () => {
    const t = new TurnTracker({ numSpeakers: 1, frameSec: 0.01, maxGapSec: 0.1, minTurnSec: 0.03, offThreshold: 0.1, pauseSec: 0.03 });
    const spans = t.push(frames('###..###....###')).concat(t.flush());
    expect(spans).toHaveLength(1);
    expect(spans[0].pauses?.map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)])).toEqual([[0.08, 0.12]]);
  });

  it('records no pauses without pauseSec', () => {
    const t = new TurnTracker({ numSpeakers: 1, frameSec: 0.01, maxGapSec: 0.1, minTurnSec: 0.03, offThreshold: 0.1 });
    const spans = t.push(frames('###....###')).concat(t.flush());
    expect(spans[0].pauses).toBeUndefined();
  });
});
