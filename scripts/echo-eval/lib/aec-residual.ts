const SR = 16_000;
const BLOCK = 320;

export function aecResidual(bleed: Float32Array, attenuationDb: number, rng: () => number): Float32Array {
  const blocks = Math.ceil(bleed.length / BLOCK);
  const raw = Array.from({ length: blocks }, () => 0.15 + 0.85 * rng());
  const smooth = raw.map((v, i) => (v + (raw[i - 1] ?? v) + (raw[i + 1] ?? v)) / 3);
  const base = 10 ** (-attenuationDb / 20);
  return bleed.map((v, i) => v * base * smooth[Math.floor(i / BLOCK)] * 2);
}

export function activity(system: Float32Array): Float32Array {
  const out = new Float32Array(system.length);
  let env = 0;
  const k = Math.exp(-1 / (0.1 * SR));
  for (let i = 0; i < system.length; i += 1) {
    env = Math.max(Math.abs(system[i]), env * k);
    out[i] = Math.min(1, env / 0.05);
  }
  return out;
}

export function duckNear(near: Float32Array, atSample: number, act: Float32Array, duckDb: number): Float32Array {
  return near.map((v, i) => v * 10 ** ((-duckDb * (act[atSample + i] ?? 0)) / 20));
}
