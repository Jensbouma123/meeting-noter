import { describe, expect, it } from 'vitest';
import type { MeetingCase } from '../types/meeting-case';
import { buildExternalCases } from './external-case';
import { pcm16ToFloat, renderExternal } from './external-render';

const [plain, bleed] = buildExternalCases({ turns: [{ start: 0, end: 1, spk: 'A' }] }, 'synthetic');
const tone = Float32Array.from({ length: 16_000 }, (_, i) => 0.5 * Math.sin(i / 10));
const energy = (x: Float32Array) => x.reduce((s, v) => s + v * v, 0);

describe('renderExternal', () => {
  it('passes the system audio through and leaves the mic silent without bleed', () => {
    const r = renderExternal(plain, tone);
    expect(r.system).toBe(tone);
    expect(r.mic).toHaveLength(tone.length);
    expect(energy(r.mic)).toBe(0);
  });

  it('bleeds the system audio into the mic deterministically per case id', () => {
    const a = renderExternal(bleed, tone).mic;
    expect(a).toHaveLength(tone.length);
    expect(energy(a)).toBeGreaterThan(0);
    expect(renderExternal(bleed, tone).mic).toEqual(a);
    const other: MeetingCase = { ...bleed, id: 'other-ext-bleed' };
    expect(renderExternal(other, tone).mic).not.toEqual(a);
  });
});

describe('pcm16ToFloat', () => {
  it('scales int16 samples to [-1, 1)', () => {
    expect(Array.from(pcm16ToFloat(Int16Array.from([0, 16384, -32768, 32767]).buffer))).toEqual([0, 0.5, -1, 32767 / 32768]);
  });
});
