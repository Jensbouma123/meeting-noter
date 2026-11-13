import { describe, expect, it } from 'vitest';
import { createStickyLanguage } from './sticky';

const d = (code: string, confidence = 0.7) => ({ code, confidence });

describe('createStickyLanguage', () => {
  it('stays unset on one unsure detection, locks on two agreeing ones', () => {
    const s = createStickyLanguage();
    expect(s.offer(d('nl'))).toBeUndefined();
    expect(s.offer(d('nl'))).toBe('nl');
  });

  it('locks at once on one very confident detection', () => {
    expect(createStickyLanguage().offer(d('nl', 0.95))).toBe('nl');
  });

  it('ignores low-confidence detections without breaking a run', () => {
    const s = createStickyLanguage();
    s.offer(d('nl'));
    expect(s.offer(d('en', 0.3))).toBeUndefined();
    expect(s.offer(d('nl'))).toBe('nl');
  });

  it('a lone or short other-language run does not flip the lock', () => {
    const s = createStickyLanguage();
    s.offer(d('nl', 0.95));
    expect(s.offer(d('en', 0.99))).toBe('nl');
    expect(s.offer(d('en', 0.99))).toBe('nl');
    expect(s.offer(d('nl'))).toBe('nl'); // back to nl resets the English run
    expect(s.offer(d('en'))).toBe('nl');
    expect(s.offer(d('en'))).toBe('nl');
  });

  it('switches after three consecutive detections in the same other language', () => {
    const s = createStickyLanguage();
    s.offer(d('nl', 0.95));
    s.offer(d('en'));
    s.offer(d('en'));
    expect(s.offer(d('en'))).toBe('en');
  });

  it('does not switch on alternating other languages', () => {
    const s = createStickyLanguage();
    s.offer(d('nl', 0.95));
    for (const c of ['en', 'fr', 'en', 'fr', 'en']) expect(s.offer(d(c))).toBe('nl');
  });

  it('reset forgets the lock', () => {
    const s = createStickyLanguage();
    s.offer(d('nl', 0.95));
    s.reset();
    expect(s.current).toBeUndefined();
  });
});
