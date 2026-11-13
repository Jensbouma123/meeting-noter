import { describe, expect, it } from 'vitest';
import { int16Rms } from './helper-protocol';
import { helperFrame } from './helper-test-socket';

describe('int16Rms', () => {
  it('is 0 for silence and an empty frame, and scales to [0, 1]', () => {
    expect(int16Rms(new Int16Array(1600))).toBe(0);
    expect(int16Rms(new Int16Array(0))).toBe(0);
    expect(int16Rms(helperFrame(-32768))).toBe(1);
  });
});
