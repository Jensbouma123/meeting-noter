import { describe, expect, it } from 'vitest';
import { meanVector, meetingCentroid } from './centroid';

const v = (...n: number[]) => new Float32Array(n);

describe('centroid', () => {
  it('returns a unit-length mean', () => {
    const m = meanVector([v(1, 0), v(0, 1)])!;
    expect(m[0]).toBeCloseTo(Math.SQRT1_2);
    expect(m[1]).toBeCloseTo(Math.SQRT1_2);
  });

  it('returns null for no vectors', () => {
    expect(meanVector([])).toBeNull();
  });

  it('needs at least 3 windows for a meeting centroid', () => {
    expect(meetingCentroid([v(1, 0), v(1, 0)])).toBeNull();
    expect(meetingCentroid([v(1, 0), v(1, 0), v(1, 0)])).not.toBeNull();
  });
});
