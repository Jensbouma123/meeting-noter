import { describe, expect, it } from 'vitest';
import { BandEnvelope } from './band-envelope';
import { classifyEcho } from './echo-classify';
import { DEFAULT_ECHO_CONFIG } from './echo-defaults';
import { measureEcho } from './echo-measure';

const SR = 16_000;

function noise(seed: number, samples: number): Float32Array {
  let s = seed;
  return Float32Array.from({ length: samples }, () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s / 2_147_483_648 - 0.5;
  });
}

function bursts(seed: number, total: number, from: number, to: number, modHz = 3): Float32Array {
  const out = new Float32Array(total);
  const src = noise(seed, total);
  for (let i = Math.round(from * SR); i < Math.round(to * SR); i += 1) {
    out[i] = src[i] * (0.5 + 0.5 * Math.sin((2 * Math.PI * modHz * i) / SR));
  }
  return out;
}

function verdictFor(system: Float32Array, mic: Float32Array, from: number, to: number) {
  const sys = new BandEnvelope();
  const near = new BandEnvelope();
  sys.push(system);
  near.push(mic);
  const f = measureEcho(near.frames(0, 1e6)!, sys.frames(0, 1e6)!, Math.round(from * 100), Math.round(to * 100), DEFAULT_ECHO_CONFIG);
  return { f, verdict: classifyEcho(f, DEFAULT_ECHO_CONFIG) };
}

describe('measureEcho', () => {
  const total = 5 * SR;
  const system = bursts(1, total, 1, 4);
  const floor = noise(9, total).map((v) => v * 0.002);

  it('calls a delayed, quieter copy of the system audio an echo', () => {
    const lag = Math.round(0.15 * SR);
    const mic = floor.map((v, i) => v + (i >= lag ? 0.3 * system[i - lag] : 0));
    const { f, verdict } = verdictFor(system, mic, 1.1, 4.1);
    expect(f!.lagMs).toBeGreaterThanOrEqual(140);
    expect(f!.lagMs).toBeLessThanOrEqual(160);
    expect(verdict).toBe('echo');
  });

  it('calls an independent burst at the same time near-end speech', () => {
    const talk = bursts(2, total, 1.7, 3.3, 4.7);
    const mic = floor.map((v, i) => v + talk[i] * 0.6);
    expect(verdictFor(system, mic, 1.7, 3.3).verdict).toBe('speech');
  });

  it('calls mic audio speech when the system side is silent', () => {
    const talk = bursts(3, total, 1, 4);
    const mic = floor.map((v, i) => v + talk[i]);
    expect(verdictFor(new Float32Array(total), mic, 1, 4).verdict).toBe('speech');
  });
});
