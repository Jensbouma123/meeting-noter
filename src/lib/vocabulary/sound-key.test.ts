import { describe, expect, it } from 'vitest';
import { editDistance } from './edit-distance';
import { soundKey } from './sound-key';

describe('soundKey / editDistance', () => {
  it('give the same key to near-misses', () => {
    expect(soundKey('Framna')).toBe(soundKey('Fromna'));
    expect(soundKey('Hezelaer')).toBe(soundKey('Hezelair'));
    expect(soundKey('Hazel')).not.toBe(soundKey('Hezelaer'));
    expect(soundKey('frame')).toBe(soundKey('Framna'));
  });

  it('counts edits and stops past the limit', () => {
    expect(editDistance('fromna', 'framna')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('abcdef', 'uvwxyz', 1)).toBe(2);
  });
});
