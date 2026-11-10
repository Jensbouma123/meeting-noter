import { describe, expect, it } from 'vitest';
import { createLanguageSwitcher, pickSupportedLanguage } from './decision';

describe('pickSupportedLanguage', () => {
  it('skips languages the ASR cannot transcribe and keeps the full-softmax confidence', () => {
    // The shape of the reported bug: an exotic top-1 on thin audio, Dutch right behind it.
    const picked = pickSupportedLanguage([
      { code: 'ha', confidence: 0.4 },
      { code: 'cy', confidence: 0.2 },
      { code: 'nl', confidence: 0.18 },
      { code: 'en', confidence: 0.1 },
    ]);
    expect(picked).toEqual({ code: 'nl', confidence: 0.18 });
  });

  it('returns nothing when no supported language is present', () => {
    expect(pickSupportedLanguage([{ code: 'ha', confidence: 1 }])).toBeUndefined();
  });
});

describe('createLanguageSwitcher', () => {
  it('ignores detections below the confidence floor', () => {
    const sw = createLanguageSwitcher();
    expect(sw.offer({ code: 'ha', confidence: 0.3 })).toBeUndefined();
    expect(sw.offer({ code: 'nl', confidence: 0.7 })?.code).toBe('nl');
    expect(sw.offer({ code: 'ha', confidence: 0.45 })?.code).toBe('nl');
  });

  it('keeps the last confident language through a single moderate disagreement', () => {
    const sw = createLanguageSwitcher();
    sw.offer({ code: 'nl', confidence: 0.9 });
    expect(sw.offer({ code: 'en', confidence: 0.6 })?.code).toBe('nl');
    expect(sw.offer({ code: 'nl', confidence: 0.8 })?.code).toBe('nl');
    // The blip did not count towards a later switch.
    expect(sw.offer({ code: 'en', confidence: 0.6 })?.code).toBe('nl');
  });

  it('switches on two agreeing detections, or at once when very sure', () => {
    const sw = createLanguageSwitcher();
    sw.offer({ code: 'nl', confidence: 0.9 });
    sw.offer({ code: 'en', confidence: 0.6 });
    expect(sw.offer({ code: 'en', confidence: 0.6 })?.code).toBe('en');
    expect(sw.offer({ code: 'de', confidence: 0.85 })?.code).toBe('de');
  });
});
