import { describe, expect, it } from 'vitest';
import { SPEAKER_COLORS, getSpeakerColor } from './speaker-theme';

describe('speaker colours', () => {
  it('ships a light and a dark text step for every speaker colour', () => {
    const missingDark = SPEAKER_COLORS.filter((colour) => !/\bdark:text-[a-z]+-\d{3}\b/.test(colour.textClass));
    expect(missingDark.map((colour) => colour.name)).toEqual([]);
    const missingLight = SPEAKER_COLORS.filter(
      (colour) => !/(?<!dark:)\btext-[a-z]+-\d{3}\b/.test(colour.textClass.replace(/dark:text-[a-z]+-\d{3}/g, '')),
    );
    expect(missingLight.map((colour) => colour.name)).toEqual([]);
  });

  it('paints dots and talk-time bars with the mid-tone stop that reads on both canvases', () => {
    for (const colour of SPEAKER_COLORS) {
      expect(colour.dotClass, colour.name).toMatch(/^bg-[a-z]+-500$/);
      expect(colour.barBgClass, colour.name).toMatch(/^bg-[a-z]+-500$/);
    }
  });

  it('never hardcodes a colour value', () => {
    for (const colour of SPEAKER_COLORS) {
      for (const value of Object.values(colour)) {
        expect(value).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(/i);
      }
    }
  });

  it('gives each speaker a distinct name colour', () => {
    const text = SPEAKER_COLORS.map((colour) => colour.textClass);
    expect(new Set(text).size).toBe(text.length);
  });

  it('wraps out-of-range and negative indices instead of throwing', () => {
    expect(getSpeakerColor(0)).toBe(SPEAKER_COLORS[0]);
    expect(getSpeakerColor(SPEAKER_COLORS.length)).toBe(SPEAKER_COLORS[0]);
    expect(getSpeakerColor(SPEAKER_COLORS.length + 2)).toBe(SPEAKER_COLORS[2]);
    expect(getSpeakerColor(-1)).toBe(SPEAKER_COLORS[SPEAKER_COLORS.length - 1]);
    expect(getSpeakerColor(Number.NaN)).toBe(SPEAKER_COLORS[0]);
  });
});
