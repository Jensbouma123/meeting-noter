const SR = 16_000;

function rng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x * 1103515245 + 12345) >>> 0;
    return x / 2 ** 32;
  };
}

export function voice(length: number, level: number, at = 0): Float32Array {
  const out = new Float32Array(length);
  const rmsOfShape = Math.sqrt((1 + 0.25 + 0.09) / 2);
  for (let i = 0; i < length; i += 1) {
    const w = (2 * Math.PI * 140 * (at + i)) / SR;
    out[i] = ((Math.sin(w) + 0.5 * Math.sin(2 * w) + 0.3 * Math.sin(3 * w)) * level) / rmsOfShape;
  }
  return out;
}

export function noise(length: number, level: number, seed = 1): Float32Array {
  const next = rng(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = (next() - 0.5) * Math.sqrt(12) * level;
  return out;
}

export function clicks(length: number, every: number, peak: number, seed = 2): Float32Array {
  const next = rng(seed);
  const out = noise(length, 0.001, seed);
  for (let at = Math.floor(every / 3); at < length; at += every) {
    const f = 2500 + next() * 2000;
    for (let i = 0; i < 0.012 * SR && at + i < length; i += 1) {
      const t = i / SR;
      out[at + i] += peak * Math.exp(-t / 0.002) * (Math.sin(2 * Math.PI * f * t) + 0.5 * (next() - 0.5));
    }
  }
  return out;
}

export function typing(length: number, perSecond: number, peak: number, seed = 3): Float32Array {
  const next = rng(seed);
  const out = noise(length, 0.001, seed);
  const mean = SR / perSecond;
  for (let at = Math.floor(next() * mean); at < length; at += Math.floor(mean * (0.5 + next()))) {
    const f = 180 + next() * 120;
    for (let i = 0; i < 0.03 * SR && at + i < length; i += 1) {
      const t = i / SR;
      out[at + i] +=
        peak * (0.6 * Math.exp(-t / 0.008) * Math.sin(2 * Math.PI * f * t) + Math.exp(-t / 0.003) * (next() - 0.5) * 2);
    }
  }
  return out;
}

export function breathing(length: number, period: number, peak: number, seed = 4): Float32Array {
  const next = rng(seed);
  const out = noise(length, 0.001, seed);
  let lp = 0;
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < length; i += 1) {
    const env = Math.sin((Math.PI * (i % period)) / period) ** 2;
    lp += ((next() - 0.5) * 2 - lp) * 0.35;
    hp = 0.97 * (hp + lp - prev);
    prev = lp;
    out[i] += peak * env * hp;
  }
  return out;
}

export function frames(audio: Float32Array, frame = SR / 10): Float32Array[] {
  const out: Float32Array[] = [];
  for (let i = 0; i < audio.length; i += frame) out.push(audio.subarray(i, Math.min(audio.length, i + frame)));
  return out;
}
